export function cowGait(distance,sprint=false){
 const phase=distance*(sprint?2.9:3.4),offsets=sprint?[0,Math.PI*.85,0.35,Math.PI*1.2]:[0,Math.PI,Math.PI,0];
 return {legs:offsets.map(offset=>({swing:Math.sin(phase+offset)*(sprint?.85:.55),knee:Math.max(0,Math.cos(phase+offset))*(sprint?.85:.42),lift:Math.max(0,Math.sin(phase+offset))*.035})),bounce:Math.abs(Math.sin(phase))*(sprint?.105:.035),lean:sprint?.09:0,head:Math.sin(phase)*.035,ears:Math.sin(phase)*.1};
}
export function feederGait(distance,running=false){
 const phase=distance*(running?3.1:4.1),stride=running?.95:.35;
 return {legs:[0,Math.PI].map(offset=>({swing:Math.sin(phase+offset)*stride,knee:Math.max(0,Math.cos(phase+offset))*(running?1:.3)})),arms:[Math.PI,0].map(offset=>Math.sin(phase+offset)*(running?.7:.18)),bounce:Math.abs(Math.sin(phase))*(running?.1:.02),lean:running?.13:0};
}
