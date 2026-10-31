// Explicit opt-in UI fixture. No API, semantic inference, asset generation or production session.
export function createConfirmationPreview({ ambiguous = false } = {}) {
  return async function prepareDream(_raw,{requestConfirmation,onProgress}) {
    const result=await requestConfirmation({
      interpretationId:'ui-demo-only',inputRevision:1,semanticHash:'test-only:not-a-content-hash',
      displaySummary:{like:'【测试解释】雨天的旧书店，水母作为柔光装饰。',fear:'【测试解释】远处的人形模仿动作，不在此处展示惊吓内容。'},
      ambiguities:ambiguous?['【测试歧义】水母是活物，还是灯具？请返回修改说明。']:[]
    });
    if(result.decision!=='accept')throw new Error('测试确认未接受。');
    onProgress('preparing');return {preview:true,fixture:'confirmation-only'};
  };
}
