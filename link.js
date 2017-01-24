const openCorpus=require("ksana-corpus").openCorpus;
const trimArticleField=require("ksana-corpus").trimArticleField;

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
		return prefix+rangeobj;
	}
	if (rangeobj.start==rangeobj.end) {
		return prefix+rangeobj.start;
	} else {
		return prefix+rangeobj.kRange;
	}
}
const hasLinkAt=function(kpos,fields) {

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
module.exports={getWorkingLinks:getWorkingLinks,makeWLinkId:makeWLinkId,parseWLinkId:parseWLinkId,
	hasLinkAt:hasLinkAt,hasUserLinkAt:hasUserLinkAt,makeMarkerId:makeMarkerId,clearWorkingLink:clearWorkingLink};