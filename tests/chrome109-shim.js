// Chrome 110 이후에 생긴 기능들을 지워서 Chrome 109처럼 만들어요.
(() => {
  const g = globalThis;
  delete Promise.withResolvers; delete g.Iterator;
  delete Map.groupBy; delete Object.groupBy; delete Array.fromAsync;
  for (const k of ["toSorted", "toReversed", "toSpliced", "with"]) { delete Array.prototype[k]; }
  for (const k of ["toSorted", "toReversed", "with"]) { try { delete Object.getPrototypeOf(Uint8Array.prototype)[k]; } catch {} }
  for (const k of ["union", "intersection", "difference", "symmetricDifference", "isSubsetOf", "isSupersetOf", "isDisjointFrom"]) delete Set.prototype[k];
  if (g.URL) { delete URL.canParse; delete URL.parse; }
  delete ArrayBuffer.prototype.transfer; delete ArrayBuffer.prototype.transferToFixedLength;
  delete String.prototype.isWellFormed; delete String.prototype.toWellFormed;
  delete Uint8Array.fromBase64; delete Uint8Array.fromHex; delete Uint8Array.prototype.toBase64; delete Uint8Array.prototype.toHex; delete Uint8Array.prototype.setFromBase64;
  delete Math.sumPrecise; delete RegExp.escape; delete g.Float16Array; delete Error.isError;
  if (g.AbortSignal) delete AbortSignal.any;
  if (g.ReadableStream) { delete ReadableStream.from; delete ReadableStream.prototype[Symbol.asyncIterator]; delete ReadableStream.prototype.values; }
})();
