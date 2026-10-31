function failure(code, message) { return Object.assign(new Error(message), { code }); }
const cancelled = () => failure('ABORTED', '本次准备已取消。');
export function validateInterpretation(value) {
  if (!value || typeof value !== 'object' || typeof value.interpretationId !== 'string' || !value.interpretationId
    || !Number.isInteger(value.inputRevision) || value.inputRevision < 0
    || typeof value.semanticHash !== 'string' || !value.semanticHash
    || !['like','fear'].every(role => typeof value.displaySummary?.[role] === 'string' && value.displaySummary[role].trim())
    || !Array.isArray(value.ambiguities)) throw failure('INVALID_INTERPRETATION', '解释信息不完整，请重新尝试。');
  return structuredClone(value);
}

// Local request identity is not a substitute for the provider's revision/confirmation ledger.
export function createGeneration({ prepare, onChange, confirm }) {
  let sequence = 0, controller;
  return {
    cancel() { sequence++; controller?.abort(); controller = null; },
    handoff() { sequence++; controller = null; },
    async run(input) {
      controller?.abort(); const id = ++sequence; controller = new AbortController();
      const signal = controller.signal;
      let settled = false, accepted = false, pending = null, acceptedKey = null;
      const current = () => id === sequence && !signal.aborted;
      function requestConfirmation(value) {
        if (!current() || settled) return Promise.reject(cancelled());
        if (typeof confirm !== 'function') return Promise.reject(failure('CONFIRMATION_REQUIRED','当前界面无法确认解释，请稍后重试。'));
        let interpretation;
        try { interpretation = validateInterpretation(value); } catch(error) { return Promise.reject(error); }
        const key = JSON.stringify(interpretation);
        if (pending) return key === pending.key ? pending.promise : Promise.reject(failure('CONFIRMATION_IN_PROGRESS','上一份解释仍待确认。'));
        if (acceptedKey === key) return Promise.resolve({decision:'accept'});
        accepted = false;
        let abortListener;
        const promise = new Promise((resolve,reject) => {
          abortListener = () => reject(cancelled());
          signal.addEventListener('abort',abortListener,{once:true});
          Promise.resolve().then(()=>{
            if(!current() || settled)throw cancelled();
            return confirm(interpretation,{signal});
          }).then(decision=>{
            if(!current() || settled)throw cancelled();
            if(decision?.decision !== 'accept')throw failure('CONFIRMATION_REQUIRED','需要确认解释后才能继续。');
            if(interpretation.ambiguities.length)throw failure('AMBIGUITY_UNRESOLVED','描述仍有需要澄清的部分，请返回修改。');
            accepted=true;acceptedKey=key;resolve({decision:'accept'});
          }).catch(reject);
        }).finally(()=>{signal.removeEventListener('abort',abortListener);if(pending?.promise===promise)pending=null;});
        pending={key,promise};
        // A broken provider may forget to await; still fail run below without an unhandled rejection.
        promise.catch(()=>{});
        return promise;
      }
      onChange({ status: 'working', stage: 'understanding' });
      try {
        if (!prepare) throw failure('PROVIDER_UNAVAILABLE','梦境生成服务尚未连接。你的描述已保留，可以返回修改。');
        const session = await prepare(Object.freeze({ ...input }), { signal, requestConfirmation,
          onProgress(stage) {
            if (!settled && current() && !pending && ['understanding','generating','preparing'].includes(stage)) {
              if(stage !== 'understanding' && !accepted)return;
              onChange({status:'working',stage});
            }
          }
        });
        if(!current())return;
        if(!accepted || pending)throw failure('CONFIRMATION_REQUIRED','生成服务未完成解释确认，不能进入梦境。请重试。');
        if (!session) throw failure('SESSION_REQUIRED','梦境未准备完成，请重试。');
        settled = true;
        onChange({ status: 'ready', stage: 'ready', session });
      } catch (error) {
        settled = true;
        if (current()) {
          // End any unawaited confirmation as well as the preparation on terminal failure.
          onChange({ status: 'error', code:error?.code, message: error?.message || '准备失败，请重试。' });
          controller?.abort();
        }
      }
    }
  };
}
