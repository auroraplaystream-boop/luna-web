export function voiceAlignment(probabilities,start,cues,step=.032){
 if(probabilities.length*step<25)return null;
 const voice=Array.from(probabilities,p=>p>=.5?1:0);
 // Ignore clicks and bridge tiny gaps inside a word.
 for(let i=1;i<voice.length-1;i++)if(!voice[i]&&voice[i-1]&&voice[i+1])voice[i]=1;
 let segments=0,total=0;for(let i=0;i<voice.length;i++){total+=voice[i];if(voice[i]&&!voice[i-1])segments++}
 if(segments<4||total*step<6||total/voice.length>.88)return null;
 const limit=120,origin=start-limit-1,length=voice.length+Math.ceil((2*limit+2)/step),captions=new Uint8Array(length);
 for(const cue of cues){if(!cue.text||/^\s*[[({♪♫].*[\])}♪♫]\s*$/.test(cue.text))continue;const from=Math.max(0,Math.round((cue.start-origin)/step)),to=Math.min(length,Math.round((cue.end-origin)/step));for(let i=from;i<to;i++)captions[i]=1}
 function score(offset,from=0,to=voice.length){const base=Math.round((start-offset-origin)/step);let tp=0,tn=0,fp=0,fn=0;for(let i=from;i<to;i++){const c=captions[base+i]||0,v=voice[i];if(v&&c)tp++;else if(v)fn++;else if(c)fp++;else tn++}const den=Math.sqrt((tp+fp)*(tp+fn)*(tn+fp)*(tn+fn));return den?(tp*tn-fp*fn)/den:-1}
 const scores=[];for(let n=-1200;n<=1200;n++)scores.push({offset:n/10,score:score(n/10)});
 scores.sort((a,b)=>b.score-a.score);const best=scores[0],other=scores.find(s=>Math.abs(s.offset-best.offset)>2.5);
 if(best.score<.55||other&&best.score-other.score<.10)return null;
 const middle=Math.floor(voice.length/2),halfBest=(from,to)=>{let bestHalf={offset:0,score:-2};for(let n=-1200;n<=1200;n++){const value=score(n/10,from,to);if(value>bestHalf.score)bestHalf={offset:n/10,score:value}}return bestHalf};
 const left=halfBest(0,middle),right=halfBest(middle,voice.length);
 if(left.score<.35||right.score<.35||Math.abs(left.offset-right.offset)>1.2)return null;
 return {offset:best.offset,matches:segments,confidence:best.score,method:'voice'};
}
