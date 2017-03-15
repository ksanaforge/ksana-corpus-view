const clearWorkingLink=require("./link").clearWorkingLink;
const makeMarkerId=require("./link").makeMarkerId;
const USER_FIELD_PREFIX="#";

//for field with same starting position,
//the short one comes later, so that it will not be overwrite by longer span
const reOrderField=function(cor,pos,value){
	var arr=[];
	for (var i=0;i<pos.length;i++) {
		arr.push([pos[i],value?value[i]:null]);
	}
	arr.sort(function(a,b){
		const r1=cor.parseRange(a[0]); //parse range is slow , don't why?
		const r2=cor.parseRange(b[0]);
		if (r1.start!==r2.start) return r1.start-r2.start;//start has higher priority

		return r2.end-r1.end;
	});
	var out={pos:[],value:[]};
	for (var i=0;i<arr.length;i++) {
		out.pos.push(arr[i][0]);
		out.value.push(arr[i][1]);
	}
	return out;
}
const decorateField=function(fname,_pos,_value,decorator,fromkpos,tokpos,fields){
	var i=0;
	//const rr=reOrderField(this.cor,_pos,_value);
	const rr={value:_value,pos:_pos};
	const pos=rr.pos,value=rr.value;
	var decorated=0;

	while (i<pos.length) {
		const id=i;
		const range=this.cor.parseRange(pos[i]);
		
		if (typeof fromkpos!==undefined && typeof tokpos !==undefined){
			if (!((range.start>fromkpos && range.start<tokpos)
			|| (range.end>fromkpos && range.end<tokpos) )){
				i++;
				continue;
			}
		}

		if (this.markinview[makeMarkerId(fname,range)]) {
			i++
			continue;
		}

		const p=pos[i],v=value?value[i]:"";
		var target=v, multitarget=false;
		i++;

		while (i<pos.length && this.cor.parseRange(pos[i]).start==range.start) {
			if (!multitarget) target=[target];
			target.push(value?value[i]:i);
			multitarget=true;
			i++;
		}
		var r;
		if (this.cor.isRange(p)){
			//by default enclose the concrete words closely
			r=this.toLogicalRange(p);
		} else {
			//tailing = false to paint just after concrete char
			//skipleading to true, so that number of footnotes will stay at begining of line
			var r2=this.toLogicalPos(p,false,true);
			r={start:r2,end:r2};
		}

		const markerid=makeMarkerId(fname,range);
		const done=this.markdone[markerid];
		decorated++;

		this.markinview[markerid]=decorator({cm:this.cm,cor:this.cor,start:r.start,end:r.end,
			corpus:this.props.corpus,
			field:fname,
			fields:fields,
			kpos:range.start,krange:range,tabid:this.props.id,id:id,target:target,
			multitarget:multitarget,actions:this.actions,done:done});

	}
	//console.log("decorated",decorated,fname)
}

const sortFields=function(fields){
	const out=[];
	for (var id in fields) {
		const field=fields[id];
		const r=this.cor.parseRange(field.from);
		out.push([r.range, field]);
	}
	out.sort(function(a,b){return a[0]-b[0]});
	const pos=out.map(function(i){return i[0]});
	const value=out.map(function(i){return i[1]});

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

const removeDeletedUserField=function(fields, oldfields){
	for (var id in oldfields) {
		const old=oldfields[id];
		const markerid=USER_FIELD_PREFIX+makeMarkerId(old.decorator,old.range);
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
	removeDeletedUserField.call(this,_fields,oldfields);
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
		decorator&&decorateField.call(this,USER_FIELD_PREFIX+name,fields[name].pos,fields[name].value,decorator);
	}
}

const decorate=function(fromkpos,tokpos,oldfields){
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
		const hitsend=phrasehits[i].hitsend;

		for (var j=0;j<hits.length;j++) {
			const r=this.toLogicalRange(  this.cor.makeRange(hits[j],hitsend[j]));

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
,decoratePageStarts:decoratePageStarts,decorateHits:decorateHits,USER_FIELD_PREFIX:USER_FIELD_PREFIX};