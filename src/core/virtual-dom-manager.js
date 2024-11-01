export class VirtualDOMManager {
  constructor(options = {}) {
    this.batchSize = options.batchSize || 100;
    this.processInterval = options.processInterval || 16;
    this.virtualTree = null;
    this.patches = new Map();
  }

  createVirtualNode(domNode) {
    return {
      type: domNode.nodeType,
      tag: domNode.tagName?.toLowerCase(),
      text: domNode.nodeType === Node.TEXT_NODE ? domNode.textContent : null,
      attributes: this.getAttributes(domNode),
      children: [],
      domReference: domNode
    };
  }

  buildVirtualTree(rootElement) {
    const vNode = this.createVirtualNode(rootElement);

    if (rootElement.childNodes.length) {
      for (const child of rootElement.childNodes) {
        if (this.shouldProcess(child)) {
          vNode.children.push(this.buildVirtualTree(child));
        }
      }
    }

    return vNode;
  }

  diffTree(oldTree, newTree) {
    if (!oldTree) {
      this.patches.set(newTree, { type: 'CREATE', node: newTree });
      return;
    }

    if (!newTree) {
      this.patches.set(oldTree, { type: 'REMOVE' });
      return;
    }

    if (this.hasChanged(oldTree, newTree)) {
      this.patches.set(oldTree, { type: 'UPDATE', node: newTree });
      return;
    }

    // Recursively diff children
    const maxLength = Math.max(
      oldTree.children?.length || 0,
      newTree.children?.length || 0
    );

    for (let i = 0; i < maxLength; i++) {
      this.diffTree(oldTree.children[i], newTree.children[i]);
    }
  }

  applyPatches() {
    for (const [node, patch] of this.patches) {
      switch (patch.type) {
        case 'CREATE':
          this.createRealNode(patch.node);
          break;
        case 'UPDATE':
          this.updateRealNode(node, patch.node);
          break;
        case 'REMOVE':
          node.domReference.remove();
          break;
      }
    }

    this.patches.clear();
  }

  processChanges(rootElement) {
    const newTree = this.buildVirtualTree(rootElement);

    if (!this.virtualTree) {
      this.virtualTree = newTree;
      return;
    }

    this.diffTree(this.virtualTree, newTree);
    this.applyPatches();
    this.virtualTree = newTree;
  }

  shouldProcess(node) {
    return node.nodeType === Node.ELEMENT_NODE ||
           (node.nodeType === Node.TEXT_NODE && node.textContent.trim());
  }

  hasChanged(oldNode, newNode) {
    return oldNode.text !== newNode.text ||
           JSON.stringify(oldNode.attributes) !== JSON.stringify(newNode.attributes);
  }

  getAttributes(domNode) {
    if (domNode.nodeType !== Node.ELEMENT_NODE) {
      return {};
    }

    const attributes = {};
    const localizableAttributes = ['placeholder', 'title', 'alt', 'aria-label'];

    for (const attr of domNode.attributes) {
      if (localizableAttributes.includes(attr.name)) {
        attributes[attr.name] = attr.value;
      }
    }

    return attributes;
  }

  createRealNode(vNode) {
    let domNode;

    if (vNode.type === Node.TEXT_NODE) {
      domNode = document.createTextNode(vNode.text);
    } else {
      domNode = document.createElement(vNode.tag);

      // Apply attributes
      Object.entries(vNode.attributes).forEach(([name, value]) => {
        domNode.setAttribute(name, value);
      });

      // Create children recursively
      vNode.children.forEach(childVNode => {
        const childDomNode = this.createRealNode(childVNode);
        domNode.appendChild(childDomNode);
      });
    }

    vNode.domReference = domNode;
    return domNode;
  }

  updateRealNode(oldVNode, newVNode) {
    const domNode = oldVNode.domReference;

    if (newVNode.type === Node.TEXT_NODE) {
      if (domNode.textContent !== newVNode.text) {
        domNode.textContent = newVNode.text;
      }
      return;
    }

    // Update attributes
    const oldAttrs = oldVNode.attributes;
    const newAttrs = newVNode.attributes;

    // Remove old attributes
    Object.keys(oldAttrs).forEach(attr => {
      if (!(attr in newAttrs)) {
        domNode.removeAttribute(attr);
      }
    });

    // Set new attributes
    Object.entries(newAttrs).forEach(([name, value]) => {
      if (oldAttrs[name] !== value) {
        domNode.setAttribute(name, value);
      }
    });

    newVNode.domReference = domNode;
  }
}