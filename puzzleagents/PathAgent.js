'use strict';
// BM_PATH_AGENT_V1: eligibility diagnostics, not a room conversion.
class PathAgent {
    static rules = Object.freeze({MazeAgent:Object.freeze({enemies:false,rewards:false})});
    static supports(key) { return Object.hasOwn(this.rules,key); }
    static inspect(graph,room,{initialRoom,exitRoom}={}) {
        const reasons=[];
        const tag=room?.tag;
        if(!room||!tag) return {eligible:false,degree:0,reasons:['missing-tag']};
        const degree=new Set(graph.getNeighbors(room)).size;
        if(degree<2) reasons.push('degree');
        if(room===initialRoom||room===exitRoom) reasons.push('endpoint');
        if(tag.tipo==='hub'||tag.subTipo==='Hub'||tag.auxiliar==='Hub') reasons.push('hub');
        if(tag.collectible!=null||room.restricoes?.length) reasons.push('reserved-resource');
        // No unknown or existing role is inferred to be free. Explicit reservation
        // must be supplied by the room planner in the next integration stage.
        if(room.bmPathSlot!==true) reasons.push('not-reserved');
        if(tag.auxiliar!=='ignore') reasons.push('existing-role');
        return {eligible:reasons.length===0,
            potential:reasons.every(r=>r==='not-reserved'||r==='existing-role'),degree,reasons};
    }
    static report(graph,rooms,options) {
        return [...new Set(rooms)].map(room=>({roomId:room.roomId,tagType:room.tag?.tipo,tagSubtype:room.tag?.subTipo,auxiliary:room.tag?.auxiliar,...this.inspect(graph,room,options)}));
    }
}
if(typeof module!=='undefined'&&module.exports)module.exports=PathAgent;
