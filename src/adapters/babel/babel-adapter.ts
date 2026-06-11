import { parse, ParserOptions } from '@babel/parser';
import type { AdapterNode, AdapterNodePath } from '../../types/node-descriptor';
import type { CsMastConfig } from '../../types/config';
import type { IParserAdapter, PostOrderVisitor, TraversalState } from '../../types/parser-adapter';
import { mapBabelAst } from './babel-node-mapper';
import { ParseError } from '../../errors';

export interface BabelAdapterOptions {
  /** Override sourceType (default: config.sourceType ?? 'module'). */
  sourceType?: 'script' | 'module' | 'unambiguous';
  /** Additional @babel/parser plugins beyond the defaults. */
  extraPlugins?: ParserOptions['plugins'];
}

export class BabelAdapter implements IParserAdapter {
  readonly parserName = '@babel/parser';
  readonly lang = 'js';
  readonly langVersion: string | undefined;

  private readonly options: BabelAdapterOptions;

  constructor(options: BabelAdapterOptions = {}) {
    this.options = options;
    this.langVersion = undefined;
  }

  parse(source: string, config: CsMastConfig): AdapterNode {
    try {
      const sourceType = this.options.sourceType ?? config.sourceType ?? 'module';
      const plugins: ParserOptions['plugins'] = [
        'jsx',
        'typescript',
        ...(config.parserPlugins ?? []),
        ...(this.options.extraPlugins ?? []),
      ] as ParserOptions['plugins'];

      const ast = parse(source, { sourceType, plugins, errorRecovery: false });
      return mapBabelAst(ast);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new ParseError(`@babel/parser failed: ${msg}`, source, this.parserName);
    }
  }

  traversePostOrder(
    root: AdapterNode,
    visitor: PostOrderVisitor,
    state: TraversalState,
  ): void {
    this.dfs(root, null, null, visitor, state);
  }

  private dfs(
    node: AdapterNode,
    parent: AdapterNode | null,
    parentPath: AdapterNodePath | null,
    visitor: PostOrderVisitor,
    state: TraversalState,
  ): void {
    const path: AdapterNodePath = { node, parent, parentPath, pathKey: node.pathKey };

    for (const child of node.children) {
      this.dfs(child, node, path, visitor, state);
    }

    visitor(path, state);
  }

  resolveByPath(root: AdapterNode, pathKey: string): AdapterNode | null {
    if (pathKey === root.pathKey) return root;

    // Strip the root prefix (e.g. 'file.program.body.0' → 'program.body.0' from root='file')
    const prefix = root.pathKey + '.';
    if (!pathKey.startsWith(prefix)) return null;
    const relative = pathKey.slice(prefix.length);
    const segments = relative.split('.');

    let current: AdapterNode | null = root;
    for (const seg of segments) {
      if (!current) return null;
      const idx = parseInt(seg, 10);
      if (!isNaN(idx)) {
        current = current.children[idx] ?? null;
      } else {
        const ref: AdapterNode | AdapterNode[] | undefined = current.refs[seg];
        if (!ref) return null;
        current = Array.isArray(ref) ? (ref[0] ?? null) : ref;
      }
    }

    return current;
  }
}
