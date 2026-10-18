import {InferenceSession,Tensor,env} from './ort.wasm.bundle.min.mjs';
env.wasm.numThreads=1;env.wasm.wasmPaths=new URL('./',import.meta.url).href;
let session;
export async function prepareVad(){session??=await InferenceSession.create(new URL('silero_vad.onnx',import.meta.url).href,{executionProviders:['wasm']});}
export async function detectVoice(audio){await prepareVad();let state=new Tensor('float32',new Float32Array(256),[2,1,128]),context=new Float32Array(64);const sr=new Tensor('int64',BigInt64Array.from([16000n]),[]),probabilities=[];
 for(let i=0;i+512<=audio.length;i+=512){const samples=new Float32Array(576);samples.set(context);samples.set(audio.subarray(i,i+512),64);const output=await session.run({input:new Tensor('float32',samples,[1,576]),state,sr});state=output.stateN;probabilities.push(Number(output.output.data[0]));context=samples.slice(-64)}
 return probabilities;
}
