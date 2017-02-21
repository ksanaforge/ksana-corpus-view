const openCorpus=require("ksana-corpus").openCorpus;
const trimArticleField=require("ksana-corpus").trimArticleField;
const bsearch=require("ksana-corpus/bsearch");

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
const hasLinkAt=function(cor,kpos,fields,corpora) {
	const out=[],targetcorpus="";
	for (var name in fields) {
		const field=fields[name];
		if (!field)continue;

		const targetcorpus=name.replace(/.*@/,"");
		if (targetcorpus==name) continue;
		const targetcor=corpora[targetcorpus];
		if (!cor.isRange(field.pos[0])) continue;

		for (var i=0;i<field.pos.length;i++) {
			const r=cor.parseRange(field.pos[i]);
			if (kpos>=r.start && kpos<=r.end) {
				var to=field.value[i];
				if (targetcor && typeof to=="number") {
					to=targetcor.stringify(to);
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