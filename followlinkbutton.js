/*TODO show multiple link 
highlight range when hover

yinshun@57p1262.1301 has two sources

*/
const React=require("react");
const ReactDOM=require("react-dom");
const E=React.createElement;
var stringifyRange=null;
if (typeof KsanaCorpus!=="undefined") {
	stringifyRange=KsanaCorpus.stringifyRange;
} else {
	const KSANACORPUS="ksana-corpus"
	stringifyRange=require(KSANACORPUS).stringifyRange;
}

const getLinkLabel=function(link,corpora){
	var linklabel=link.to;
	if (!corpora) {
		return linklabel;
	}

	const cor=corpora[link.corpus]; //not open yet
	if (!cor) {
		if (typeof linklabel=="number") {
			const l=linklabel=stringifyRange(linklabel,link.corpus);
			if (l) return l;
		}
		return (typeof link.to=="string")?link.to:link.corpus;
	}
	const shortname=typeof (link.to!=="number")?cor.getGroupName(link.to):"";
	if (typeof linklabel=="number") {
		linklabel=link.corpus+"@"+cor.stringify(linklabel);
	}
	linklabel=linklabel.replace(/\..*/,"");//remove after page,make it shorter;
	if (shortname) linklabel=shortname+"p"+linklabel.replace(/.+p/,"");
	return linklabel;
}
const followLink=function(cm,links,actions,corpora){
	if (!links)return;
	if (!Object.keys(links).length) return;

	const onMouseDown=function(e){
		e.stopPropagation&&e.stopPropagation();
		actions.openLink(e.target.target);
	}

	const onMouseOver=function(e){
		const link=links[e.target.id];
		if (link && link.from) actions.highlightAddress(link.from);
	}

	var widget=document.createElement("span");
	widget.className="followbuttongroup";
	
	for (var id in links) {
		var child=document.createElement("span");
		child.onmousedown=onMouseDown;
		child.onmouseover=onMouseOver;	
		child.className="followbutton"

		const linklabel=getLinkLabel(links[id],corpora);
		child.target=links[id].corpus+"@"+links[id].to;
		child.innerHTML=linklabel;
		child.id=id;
		widget.appendChild(child);
	}
	
	const insertat={line:cm.getCursor().line,ch:cm.getCursor().ch}
	return cm.setBookmark(insertat,{widget:widget,handleMouseEvents:true});
}

module.exports=followLink;