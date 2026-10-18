import {prepareVad,detectVoice} from './vad/detect.mjs';
import {voiceAlignment} from './vad/alignment.mjs';
import {pipeline,env} from './speech/transformers.min.js';
env.allowLocalModels=false;
env.backends.onnx.wasm.numThreads=1;
env.backends.onnx.wasm.wasmPaths=new URL('./speech/',import.meta.url).href;
let recognizer,embedder;
const status=text=>postMessage({type:'status',text});
self.onmessage=async({data})=>{try{
 if(data.type==='prepare'){
 status('Preparando a comparação dos intervalos de fala…');
 await prepareVad();
 postMessage({type:'ready'});return;
 }
 if(data.type!=='analyze')return;
 status('Comparando os momentos de fala e silêncio com a legenda…');
 const probabilities=await detectVoice(data.audio);const alignment=voiceAlignment(probabilities,data.start,data.cues);if(alignment){postMessage({type:'result',alignment});return}
 status('Conferindo o conteúdo das falas. No primeiro uso, baixando o modelo de voz…');
 recognizer??=await pipeline('automatic-speech-recognition','Xenova/whisper-tiny',{dtype:'q8',device:'wasm'}); 
 const result=await recognizer(data.audio,{return_timestamps:'word',task:'transcribe',chunk_length_s:30,stride_length_s:5});
 const words=(result.chunks||[]).filter(c=>Number.isFinite(c.timestamp?.[0]));
 const speech=[];
 for(let start=0;start<words.length;start++)for(const size of [4,6,8,10,12,16]){const phrase=words.slice(start,start+size);if(phrase.length<size)continue;speech.push({start:data.start+phrase[0].timestamp[0],end:data.start+(phrase.at(-1).timestamp[1]??phrase.at(-1).timestamp[0]),text:phrase.map(c=>c.text).join('')})}
 // Multilingual sentence embeddings compare original speech with translated subtitles.
 status('Comparando as falas com a legenda. No primeiro uso, baixando o modelo de idiomas…');
 embedder??=await pipeline('feature-extraction','Xenova/paraphrase-multilingual-MiniLM-L12-v2',{dtype:'q8',device:'wasm'});
 const texts=[...speech.map(c=>c.text),...data.cues.map(c=>c.text)];
 const vectors=[];for(let i=0;i<texts.length;i+=12){const batch=await embedder(texts.slice(i,i+12),{pooling:'mean',normalize:true});vectors.push(...batch.tolist())}
 const matches=[];
 for(let s=0;s<speech.length;s++){
 const scores=data.cues.map((_,c)=>({speech:s,cue:c,score:vectors[s].reduce((sum,v,i)=>sum+v*vectors[speech.length+c][i],0)})).sort((a,b)=>b.score-a.score);
 if(scores[0]?.score>=.84&&scores[0].score-(scores[1]?.score??0)>=.06)matches.push(scores[0]);
 }
 postMessage({type:'result',speech,matches});
 }catch(error){postMessage({type:'error',text:error?.message||'Falha no reconhecimento de voz.'})}};
