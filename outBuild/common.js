const isHTML = (text) => {
    const doc = new DOMParser().parseFromString(text, "text/html");
    return Array.from(doc.body.childNodes).some(node => node.nodeType === 1);
};
//# sourceMappingURL=common.js.map