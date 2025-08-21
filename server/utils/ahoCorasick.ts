/**
 * Implementation of the Aho-Corasick string matching algorithm
 * This algorithm efficiently finds all occurrences of a set of patterns in a text
 * by preprocessing the patterns into a finite state machine and then scanning the text once.
 */

// Node in the Aho-Corasick trie
class AhoCorasickNode {
  children: Map<string, AhoCorasickNode>;
  failureLink: AhoCorasickNode | null;
  outputLinks: Array<{pattern: string, patternIndex: number}>;
  isEnd: boolean;
  depth: number;
  
  constructor(depth: number = 0) {
    this.children = new Map();
    this.failureLink = null;
    this.outputLinks = [];
    this.isEnd = false;
    this.depth = depth;
  }
}

// Main Aho-Corasick automaton
export class AhoCorasick {
  private root: AhoCorasickNode;
  private patterns: string[];
  private patternData: any[];
  private isBuilt: boolean;
  
  constructor() {
    this.root = new AhoCorasickNode();
    this.patterns = [];
    this.patternData = [];
    this.isBuilt = false;
  }
  
  /**
   * Add a pattern to the automaton
   * @param pattern The string pattern to search for
   * @param data Any associated data with this pattern
   */
  addPattern(pattern: string, data: any = null): void {
    // Store normalized pattern and data
    const normalizedPattern = pattern.toLowerCase();
    this.patterns.push(normalizedPattern);
    this.patternData.push(data);
    
    // Mark automaton as not built after adding a pattern
    this.isBuilt = false;
    
    // Add pattern to trie
    let current = this.root;
    for (let i = 0; i < normalizedPattern.length; i++) {
      const char = normalizedPattern[i];
      if (!current.children.has(char)) {
        current.children.set(char, new AhoCorasickNode(current.depth + 1));
      }
      current = current.children.get(char)!;
    }
    
    // Mark the end of the pattern
    current.isEnd = true;
    current.outputLinks.push({
      pattern: normalizedPattern,
      patternIndex: this.patterns.length - 1
    });
  }
  
  /**
   * Build the automaton's failure links and output links
   * This must be called after adding all patterns and before searching
   */
  build(): void {
    if (this.isBuilt) return;
    
    // BFS to build failure links
    const queue: AhoCorasickNode[] = [];
    
    // Set failure links for depth 1 nodes to root
    Array.from(this.root.children.entries()).forEach(([char, node]) => {
      node.failureLink = this.root;
      queue.push(node);
    });
    
    // Process the rest of the nodes
    while (queue.length > 0) {
      const current = queue.shift()!;
      
      // Process all child nodes
      Array.from(current.children.entries()).forEach(([char, child]) => {
        queue.push(child);
        
        // Find the failure node
        let failureNode = current.failureLink;
        
        while (failureNode !== null && !failureNode.children.has(char)) {
          failureNode = failureNode.failureLink;
        }
        
        // Set failure link - if no matching prefix, point to root
        if (failureNode === null) {
          child.failureLink = this.root;
        } else {
          child.failureLink = failureNode.children.get(char)!;
          
          // Copy output links from failure node
          for (const outputLink of child.failureLink.outputLinks) {
            child.outputLinks.push(outputLink);
          }
        }
      });
    }
    
    this.isBuilt = true;
  }
  
  /**
   * Search for all occurrences of the patterns in the text
   * @param text The text to search in
   * @returns Array of matches with pattern information and position
   */
  search(text: string): Array<{
    pattern: string,
    patternIndex: number,
    position: number,
    data: any
  }> {
    if (!this.isBuilt) {
      this.build();
    }
    
    const matches = [];
    const normalizedText = text.toLowerCase();
    let current = this.root;
    
    // Single pass through the text
    for (let i = 0; i < normalizedText.length; i++) {
      const char = normalizedText[i];
      
      // Follow failure links until we find a node with the current character
      // or we reach the root
      while (current !== this.root && !current.children.has(char)) {
        current = current.failureLink!;
      }
      
      // Try to follow the edge with current character
      if (current.children.has(char)) {
        current = current.children.get(char)!;
        
        // Check if this node has any output links
        if (current.outputLinks.length > 0) {
          for (const {pattern, patternIndex} of current.outputLinks) {
            // Calculate the starting position of the match
            const position = i - pattern.length + 1;
            matches.push({
              pattern,
              patternIndex,
              position,
              data: this.patternData[patternIndex]
            });
          }
        }
      }
    }
    
    return matches;
  }
}