const clearWorkingLink=require("./link").clearWorkingLink;
const makeMarkerId=require("./link").makeMarkerId;
const decorateField=function(fname,pos,value,decorator,fromkpos,tokpos,fields){
		var i=0;
		while (i<pos.length) {
			const id=i;
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
			var r;
			if (this.cor.isRange(p)){
				r=this.cor.isRange(p)
			} else {
				rr=this.toLogicalPos(p);
				r={start:rr,end:rr};
			}

			const markerid=makeMarkerId(fname,range);
			const done=this.markdone[markerid];

			this.markinview[markerid]=decorator({cm:this.cm,cor:this.cor,start:r.start,end:r.end,
				corpus:this.props.corpus,
				fields:fields,
				kpos:range.start,krange:range,tabid:this.props.id,id:id,target:target,
				multitarget:multitarget,actions:this.actions,done:done});
		}
}

const sortFields=function(fields){
	const out=[];
	for (var id in fields) {
		const field=fields[id];
		const r=this.cor.parseRange(field.from);
		out.push([r.kRange, field]);
	}
	out.sort(function(a,b){return a[0]-b[0]});
	const pos=out.map(function(i){return i[0]});
	const value=out.map(function(i){return i[1]});
	const starts=out.map(function(i){return i[2]});

	return {pos:pos,value:value};
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
	for (var id in oldfields) {
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
const getDecorator=function(fieldname) { //might suffix with @
	var decoratorname=fieldname;
	const at=fieldname.indexOf("@");
	if (at>0) decoratorname=decoratorname.substr(0,at);

	return this.props.decorators[decoratorname];
}
const decorateUserField=function(_fields, oldfields){
	removeDeleted.call(this,_fields,oldfields);
	const ff=sortFields.call(this,_fields);
	for (var _f in _fields) { //remove all worling link marker, force redraw
		clearWorkingLink.call(this,_f,true);
	}

	const fields=groupByDecorator(ff.pos,ff.value);
	for (var name in fields) {
		decoratorname=name;
		const at=name.indexOf("@");
		if (at>0) decoratorname=decoratorname.substr(0,at);
		const decorator=getDecorator.call(this,name);;
		decorator&&decorateField.call(this,name,fields[name].pos,fields[name].value,decorator);
	}

}
const decorate=function(fromkpos,tokpos){
	for (var fname in this.props.fields) {
		if (!this.props.fields[fname]) continue;
		const pos=this.props.fields[fname].pos, value=this.props.fields[fname].value;		
		const decorator=getDecorator.call(this,fname);
		decorator&&decorateField.call(this,fname,pos,value,decorator,fromkpos,tokpos,this.props.fields);
	}
}
const decorateHits=function(phrasehits){
	if (!phrasehits)return;
	if (!this._hits) this._hits=[];
	else {
		this._hits.forEach(function(h){h.clear()});
		this._hits=[];			
	}

	for (var i=0;i<phrasehits.length;i++) {
		const hits=phrasehits[i].hits;
		const lengths=phrasehits[i].lengths;
		for (var j=0;j<hits.length;j++) {
			const r=this.toLogicalRange(  this.cor.makeKRange(hits[j],hits[j]+ (lengths[j]||lengths)));
			const marker=this.cm.markText(r.start,r.end,{className:'hl'+i});
			this._hits.push(marker);
		}
	}
}
const decoratePageStarts=function(){
	if (!this._pageStarts) this._pageStarts=[];
	else {
		this._pageStarts.forEach(function(pagestart){pagestart.clear()});
		this._pageStarts=[];			
	}
	const regexpb=/p(\d+[a-z]?)/;
	for (var i=0;i<this.state.pagebreaks.length;i++) {
		const pb=this.state.pagebreaks[i];
		const linech=this.toLogicalRange(pb);
		const ele=document.createElement("div");
		const label=document.createElement("span");
		label.className="pblabel"

		label.innerHTML=this.cor.stringify(pb).match(regexpb)[1];

		ele.appendChild(label);
		ele.className="pb";
		this._pageStarts.push(this.cm.doc.addLineWidget(linech.start.line, ele,{above:true}));
	}
}
module.exports={decorate:decorate,decorateField:decorateField,decorateUserField:decorateUserField
,decoratePageStarts:decoratePageStarts,decorateHits:decorateHits};