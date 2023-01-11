const isHTML = (text: string): boolean => {
    const doc = new DOMParser().parseFromString(text, "text/html");
    return Array.from(doc.body.childNodes).some(node => node.nodeType === 1);
}