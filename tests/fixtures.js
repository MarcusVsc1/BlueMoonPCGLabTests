// Room e Edge: contratos do repositorio consultado; apenas para testes isolados.
class Room {
 static id=0;
 constructor(cells,roomHeight,roomWidth,tag={}){this.roomId=Room.id++;this.roomHeight=roomHeight;this.roomWidth=roomWidth;this.cells=cells;this.unavailableCells=[];this.terminalCells=[];this.tag=tag;this.restricoes=[];}
 addTerminalCell(c){this.terminalCells.push(c);}
 findEdgeCells(){const out=[];for(let i=0;i<this.roomWidth;i++)for(let j=0;j<this.roomHeight;j++)if(i===0||j===0||i===this.roomWidth-1||j===this.roomHeight-1)out.push({x:i+this.cells[0].x,y:j+this.cells[0].y});return out;}
}
class Edge {constructor(fromRoom,toRoom,cells){this.fromRoom=fromRoom;this.toRoom=toRoom;this.cells=cells;this.tags=[];this.restricoes=[];}hash(){return JSON.stringify('fromRoom: ['+this.fromRoom+'], toRoom: ['+this.toRoom+']');}}
