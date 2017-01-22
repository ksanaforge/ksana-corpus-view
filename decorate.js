const {makeMarkerId,clearWorkingLink}=require("./link");
const decorateField=function(fname,pos,value,decorator,fromkpos,tokpos){
		let i=0;
		while (i<pos.length) {
			const range=this.cor.parseRange(pos[i]);
			if (typeof fromkpos!==undefined && typeof tokpos !==undefined){
				if (range.start<fromkpos || range.end>tokpos) {
					i++;
					continue;
				}
			}

			if (this.markinview[makeMarkerId(fname,range)]) {
				i++
				continue;
			}

			const p=pos[i],v=value[i];
			var target=value[i], multitarget=false;
			i++;

			while (i<pos.length && this.cor.parseRange(pos[i]).start==range.start) {
				if (!multitarget) target=[target];
				target.push(value[i]);
				multitarget=true;
				i++;
			}

			const r=this.toLogicalRange(p);
			const markerid=makeMarkerId(fname,range);
			const done=this.markdone[markerid];
			this.markinview[markerid]=decorator({cm:this.cm,cor:this.cor,start:r.start,end:r.end,corpus:this.props.corpus,
				kpos:range.start,krange:range,tabid:this.props.id,id:i,target,
				multitarget,actions:this.actions,done});
		}
}

const sortFields=function(fields){
	const out=[];
	for (let id in fields) {
		const field=fields[id];
		const r=this.cor.parseRange(field.from);
		out.push([r.kRange, field]);
	}
	out.sort((a,b)=>a[0]-b[0]);
	const pos=out.map((i)=>i[0]);
	const value=out.map((i)=>i[1]);
	const starts=out.map((i)=>i[2]);

	return {pos,value};
}
const groupByDecorator=function(pos,value){
	const out={};
	for (var i=0;i<value.length;i++) {
		const v=value[i];
		if (!out[v.decorator]) out[v.decorator]={pos:[],value:[]};
		out[v.decorator].pos.push(pos[i]);
		out[v.decorator].value.push(v);
	}
	return out;
}

const removeDeleted=function(fields, oldfields){
	for (let id in oldfields) {
		const old=oldfields[id];
		const markerid=makeMarkerId(old.decorator,old.kRange);
		if (!fields[id]) {
			const m=this.markinview[markerid];
			if (m){
				m.clear();
				delete this.markinview[markerid];
				clearWorkingLink.call(this,id,false);
			}
		}
	}
}
const decorateUserField=function(_fields, oldfields){
	removeDeleted.call(this,_fields,oldfields);
	const {pos,value}=sortFields.call(this,_fields);
	for (let f in _fields) { //remove all worling link marker, force redraw
		clearWorkingLink.call(this,f,true);
	}

	const fields=groupByDecorator(pos,value);
	for (let name in fields) {
		const decorator=this.props.decorators[name];
		decorateField.call(this,name,fields[name].pos,fields[name].value,decorator);
	}

}
const decorate=function(fromkpos,tokpos){
	for (let fname in this.props.fields) {
		if (!this.props.fields[fname]) continue;
		const pos=this.props.fields[fname].pos, value=this.props.fields[fname].value;
		const decorator=this.props.decorators[fname];
		if (!decorator) continue;
		decorateField.call(this,fname,pos,value,decorator,fromkpos,tokpos);
	}
}
module.exports={decorate,decorateField,decorateUserField};