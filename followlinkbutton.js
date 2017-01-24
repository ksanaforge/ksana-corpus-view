/*TODO show multiple link 
highlight range when hover

yinshun@57p1262.1301 has two sources

*/
const React=require("react");
const ReactDOM=require("react-dom");
const E=React.createElement;
const hasUserLinkAt=require("./link").hasUserLinkAt;
const followLink=function(cm,kpos,fields,actions){
	const links=hasUserLinkAt(kpos,fields);
	
	if (!Object.keys(links).length) return;

	const onMouseDown=function(e){
		e.stopPropagation();
		actions.openLink(e.target.target);
	}

	const onMouseOver=function(e){
		const link=links[e.target.id]
		actions.highlightAddress(link.from);
	}

	var widget=document.createElement("span");
	widget.className="followbuttongroup";
	
	for (var id in links) {
		var child=document.createElement("span");
		child.onmousedown=onMouseDown;
		child.onmouseover=onMouseOver;	
		child.className="followbutton"
		child.target=links[id].corpus+"@"+links[id].to;
		child.innerHTML=links[id].to.replace(/\..*/,"");//remove after page,make it shorter
		child.id=id;
		widget.appendChild(child);
	}
	
	const insertat={line:cm.getCursor().line,ch:cm.getCursor().ch}
	return cm.setBookmark(insertat,{widget:widget,handleMouseEvents:true});
}

module.exports=followLink;