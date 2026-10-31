import { DatabaseSync } from 'node:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import { fail, validateRaw, validateSemantics } from '../src/personalization/contracts.js';
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
// One SQLite transaction owns a state transition. No network calls inside transactions.
export class DreamLedger {
  constructor(path = ':memory:') {
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS clients (id TEXT PRIMARY KEY, revision INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS drafts (owner TEXT, revision INTEGER, raw TEXT, result TEXT, confirmation TEXT, cancelled INTEGER DEFAULT 0, PRIMARY KEY(owner,revision));
      CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, owner TEXT, revision INTEGER, job_key TEXT UNIQUE, status TEXT, result TEXT);`);
    // A process crash during submission cannot safely be retried as a fresh paid call.
    this.db.exec("UPDATE jobs SET status='submissionUnknown' WHERE status='submitting'");
  }
  transaction(fn) { this.db.exec('BEGIN IMMEDIATE'); try { const result=fn();this.db.exec('COMMIT');return result; } catch(e) {this.db.exec('ROLLBACK');throw e;} }
  begin(owner, input) {
    const raw=JSON.stringify(validateRaw(input));
    return this.transaction(()=>{
      const current=this.db.prepare('SELECT revision FROM clients WHERE id=?').get(owner)?.revision??0;
      const old=this.db.prepare('SELECT * FROM drafts WHERE owner=? AND revision=?').get(owner,current);
      if (old && old.raw===raw && !old.cancelled) return {...old,raw:JSON.parse(old.raw),result:old.result&&JSON.parse(old.result)};
      const revision=current+1;
      this.db.prepare('INSERT INTO clients VALUES (?,?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision').run(owner,revision);
      this.db.prepare('INSERT INTO drafts(owner,revision,raw) VALUES (?,?,?)').run(owner,revision,raw);
      return {revision,raw:JSON.parse(raw)};
    });
  }
  current(owner, revision) {
    const row=this.db.prepare('SELECT d.* FROM drafts d JOIN clients c ON c.id=d.owner AND c.revision=d.revision WHERE d.owner=? AND d.revision=?').get(owner,revision);
    if (!row || row.cancelled) throw fail('STALE_REVISION','这份描述已失效，请重新准备。',409);
    return row;
  }
  interpret(owner, revision, value) {
    return this.transaction(()=>{
      const row=this.current(owner,revision);
      if(row.result)return JSON.parse(row.result);
      const semantic=validateSemantics(value);
      const result={...semantic,interpretationId:randomUUID(),inputRevision:revision,semanticHash:hash(semantic)};
      this.db.prepare('UPDATE drafts SET result=? WHERE owner=? AND revision=?').run(JSON.stringify(result),owner,revision);
      return result;
    });
  }
  confirm(owner, revision, interpretationId, semanticHash) {
    return this.transaction(()=>{
      const row=this.current(owner,revision), result=row.result&&JSON.parse(row.result);
      if (!result || result.interpretationId!==interpretationId || result.semanticHash!==semanticHash || result.ambiguities.length)
        throw fail('CONFIRMATION_REQUIRED','请先确认当前描述的理解。',409);
      const id=row.confirmation??randomUUID();
      this.db.prepare('UPDATE drafts SET confirmation=? WHERE owner=? AND revision=?').run(id,owner,revision);
      return {confirmationId:id,inputRevision:revision};
    });
  }
  reserve(owner, revision, confirmationId, recipe, providerVersion) {
    return this.transaction(()=>{
      const row=this.current(owner,revision);
      if (!confirmationId || row.confirmation!==confirmationId)throw fail('CONFIRMATION_REQUIRED','需要有效确认。',409);
      const key=hash([owner,confirmationId,recipe,providerVersion]);
      let job=this.db.prepare('SELECT * FROM jobs WHERE job_key=?').get(key);
      if(!job){const id=randomUUID();this.db.prepare('INSERT INTO jobs VALUES (?,?,?,?,?,NULL)').run(id,owner,revision,key,'reserved');job=this.job(owner,id);}
      return job;
    });
  }
  job(owner,id) { const row=this.db.prepare('SELECT * FROM jobs WHERE owner=? AND id=?').get(owner,id);if(!row)throw fail('NOT_FOUND','任务不存在。',404);return row; }
  transition(owner,id,from,to,result=null) {
    const transitions={reserved:['submitting','cancelled'],submitting:['queued','submissionUnknown','failed'],queued:['validating','failed'],validating:['ready','rejected']};
    if(!transitions[from]?.includes(to))throw fail('INVALID_TRANSITION','非法任务状态。',409);
    const row=this.job(owner,id);this.current(owner,row.revision);
    if(to==='ready')throw fail('VALIDATOR_UNAVAILABLE','生成资源与世界适配验证尚未接入。',503);
    if(!this.db.prepare('UPDATE jobs SET status=?,result=? WHERE id=? AND owner=? AND status=?').run(to,JSON.stringify(result),id,owner,from).changes)
      throw fail('STATE_CONFLICT','任务状态已改变，请查询原任务。',409);
    return this.job(owner,id);
  }
  cancel(owner,revision) {this.db.prepare('UPDATE drafts SET cancelled=1 WHERE owner=? AND revision=?').run(owner,revision);}
  close(){this.db.close();}
}
