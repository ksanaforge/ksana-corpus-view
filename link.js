var bsearch=null,trimArticleField=null

if (typeof KsanaCorpus!=="undefined") {
	trimArticleField=KsanaCorpus.trimArticleField;
	bsearch=KsanaCorpus.bsearch;
} else {
	const KSANACORPUS="ksana-corpus";
	trimArticleField=require(KSANACORPUS).trimArticleField;
	bsearch=require(KSANACORPUS).bsearch;
}


const BILINKREGEX=/.*</;

const	getWorkingLinks=function(workinglinks,prefix,article){
	const fields=trimArticleField(workinglinks,article);
	const value=fields.value.map( function(v){return  prefix+"@"+v});
	return {pos:fields.pos,value:value};
}
const makeWLinkId=function(kpos,address){
	return kpos.toString(36) +"_"+address.replace(/.+@/,"");
}
const parseWLinkId=function(wlinkid){
	return parseInt(wlinkid.replace(/_.+/,""),36);
}
const makeMarkerId=function(prefix,rangeobj){
	if (typeof rangeobj=="number") {
		return prefix+"_"+rangeobj;
	}
	if (rangeobj.start==rangeobj.end) {
		return prefix+"_"+rangeobj.start;
	} else {
		return prefix+"_"+rangeobj.range;
	}
}
const hasLinkAt=function(cor,kpos,fields,corpora,stringifyRange) {
	var out=[];
	for (var name in fields) {
		const field=fields[name];
		if (!field || !field.pos || !field.pos[0])continue;
		if (name=="jpeg"||name=="png") return;

		if (!cor.isRange(field.pos[0])) continue;

		var targetcorpus=name.replace(BILINKREGEX,"");
		if (targetcorpus==name) targetcorpus=cor.id;

		//cannot have valid target in field.value
		if (name=="rend" || name=="head")continue;
		for (var i=0;i<field.pos.length;i++) {
			const r=cor.parseRange(field.pos[i]);
			if (kpos>=r.start && kpos<=r.end) {
				var to=field.value[i];
				if (to&&to[0]=="<") continue;
				if (to&&to.length>100) continue;
				if (typeof to=="number") {
					const str_to=stringifyRange(to,targetcorpus);
					if (str_to) to=str_to;
				}
				out.push({id:i,corpus:targetcorpus,from:field.pos[i],to:to});
			}
		}
	}
	return out;
}
const hasUserLinkAt=function(kpos,userfields){
	const out={};
	for (var id in userfields) {
		const field=userfields[id];
		if (kpos>=field.start && kpos<=field.end) out[id]=field;
	}
	return out;
}

const clearWorkingLink=function(f,done){
	if (!this.markinview ||!this.markdone)return;
	const p=parseWLinkId(f);
	const markerid=makeMarkerId("wlink",p);
	const m=this.markinview[markerid];
	if (m) {
		m.clear();
		if (done){
			this.markdone[markerid]=done;	
		} else if (this.markdone[markerid]) {
			delete this.markdone[markerid];
		}
		delete this.markinview[markerid];
	}	
}

const hasHitAt=function(kpos,articlehits){
	if (!articlehits)return null;
	for (var i=0;i<articlehits.length;i++) {
		const phrase=articlehits[i];
		const hits=articlehits[i].hits;
		const at=bsearch(hits,kpos+1 ,true)-1;
		if (hits[at]-1<kpos && hits[at]+(phrase.lengths[at]||phrase.lengths)>=kpos) {
			return {phrase:i,nhit:at};
		}
	}
	return null;
}

module.exports={getWorkingLinks:getWorkingLinks,makeWLinkId:makeWLinkId,parseWLinkId:parseWLinkId,
	hasLinkAt:hasLinkAt,hasUserLinkAt:hasUserLinkAt,makeMarkerId:makeMarkerId,clearWorkingLink:clearWorkingLink,
hasHitAt:hasHitAt};