import '../lib/process-polyfill';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { useColorMode } from '@docusaurus/theme-common';
import type { ScatCategory, CsMastConfig, AdapterNode } from '@shriyanss/cs-mast';
type CsMastInitFn = typeof import('@shriyanss/cs-mast').cs_mast_init;
import styles from './playground.module.css';

const SCAT_CATEGORIES: ScatCategory[] = [
  'lit', 'val', 'id', 'name', 'op', 'op_name', 'decl', 'loop', 'cond',
];

const DEFAULT_CODE = `// CS-MAST Playground — edit me!
function greet(name) {
  const message = "Hello, " + name;
  if (name) {
    console.log(message);
  }
  return message;
}

for (let i = 0; i < 3; i++) {
  greet("world");
}
`;

// ── Helpers ─────────────────────────────────────────────────────────────────

function getSignature(node: AdapterNode): string {
  const raw = node._raw as Record<string, unknown> | undefined;
  if (raw && typeof raw['cs-mast-s-hash'] === 'string') {
    return raw['cs-mast-s-hash'] as string;
  }
  return '';
}

function getRawRange(node: AdapterNode): { start: number; end: number } | null {
  const raw = node._raw as { start?: number; end?: number } | undefined;
  if (raw && raw.start !== undefined && raw.end !== undefined) {
    return { start: raw.start, end: raw.end };
  }
  return null;
}

/**
 * Find the most specific (deepest) AdapterNode whose source range fully
 * contains [selStart, selEnd]. For a cursor (no selection), selStart === selEnd.
 */
function findNodeAtOffset(
  node: AdapterNode,
  selStart: number,
  selEnd: number,
): AdapterNode | null {
  const range = getRawRange(node);
  if (!range) return null;
  // Skip nodes that don't contain the selection at all
  if (range.end < selStart || range.start > selEnd) return null;

  // Try children first (deeper = more specific)
  for (const child of node.children) {
    const found = findNodeAtOffset(child, selStart, selEnd);
    if (found) return found;
  }

  // This node contains the selection; return it if the selection fits
  if (range.start <= selStart && range.end >= selEnd) return node;
  return null;
}

function hasActiveDescendant(node: AdapterNode): boolean {
  if (node.isActivelyHashed) return true;
  return node.children.some(hasActiveDescendant);
}

// ── TreeNode ─────────────────────────────────────────────────────────────────

interface TreeNodeProps {
  node: AdapterNode;
  depth: number;
  hideInactive: boolean;
  selectedPathKey: string | null;
}

function TreeNode({ node, depth, hideInactive, selectedPathKey }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(depth < 2);
  const [copied, setCopied] = useState(false);
  const nodeRef = useRef<HTMLDivElement>(null);

  const hasChildren = node.children.length > 0;
  const isActive = !!node.isActivelyHashed;
  const sig = getSignature(node);

  const isSelected = selectedPathKey === node.pathKey;
  // Auto-expand when a descendant is selected
  const isAncestorOfSelected =
    selectedPathKey !== null &&
    selectedPathKey !== node.pathKey &&
    selectedPathKey.startsWith(node.pathKey + '.');
  const shouldExpand = expanded || isAncestorOfSelected;

  // Scroll selected node into view
  useEffect(() => {
    if (isSelected && nodeRef.current) {
      nodeRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [isSelected]);

  if (hideInactive && !isActive && !hasActiveDescendant(node)) {
    return null;
  }

  const copyTarget = sig || node.computedHash || '';

  const handleHashClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!copyTarget) return;
    navigator.clipboard.writeText(copyTarget).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const headerClass = [
    styles.treeNodeHeader,
    isSelected ? styles.treeNodeSelected : '',
    !isActive ? styles.treeNodeDimmed : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={styles.treeNode} ref={nodeRef}>
      <div
        className={headerClass}
        onClick={() => hasChildren && setExpanded((e) => !e)}
        role={hasChildren ? 'button' : undefined}
        tabIndex={hasChildren ? 0 : undefined}
        onKeyDown={(e) => {
          if (hasChildren && (e.key === 'Enter' || e.key === ' ')) {
            setExpanded((v) => !v);
          }
        }}
      >
        <span className={styles.treeToggle}>
          {hasChildren ? (shouldExpand ? '▼' : '▶') : '·'}
        </span>
        <span className={styles.treeNodeType}>{node.nodeType}</span>
        {isActive && <span className={styles.activeHashBadge}>hashed</span>}
        <span className={styles.treeNodeMeta}>
          {node.name !== undefined && (
            <span>
              <span className={styles.metaKey}>name=</span>
              <span className={styles.metaValue}>"{node.name}"</span>
            </span>
          )}
          {node.value !== undefined && (
            <span>
              <span className={styles.metaKey}>val=</span>
              <span className={styles.metaValue}>"{node.value}"</span>
            </span>
          )}
          {node.operator !== undefined && (
            <span>
              <span className={styles.metaKey}>op=</span>
              <span className={styles.metaValue}>"{node.operator}"</span>
            </span>
          )}
          {node.kind !== undefined && (
            <span>
              <span className={styles.metaKey}>kind=</span>
              <span className={styles.metaValue}>{node.kind}</span>
            </span>
          )}
          {node.computedHash && (
            <span
              className={`${styles.metaHash} ${styles.metaHashClickable}`}
              onClick={handleHashClick}
              title={copied ? 'Copied!' : `Click to copy ${sig ? 'signature' : 'hash'}`}
            >
              {copied ? 'copied!' : node.computedHash}
            </span>
          )}
        </span>
      </div>
      {(shouldExpand || !hasChildren) && isActive && sig && (
        <div style={{ paddingLeft: 34, marginBottom: 4 }}>
          <span className={styles.sigPill}>{sig}</span>
        </div>
      )}
      {shouldExpand && hasChildren && (
        <div className={styles.treeChildren}>
          {node.children.map((child, i) => (
            <TreeNode
              key={i}
              node={child}
              depth={depth + 1}
              hideInactive={hideInactive}
              selectedPathKey={selectedPathKey}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── PlaygroundInner ──────────────────────────────────────────────────────────

type MonacoEditor = import('monaco-editor').editor.IStandaloneCodeEditor;

function PlaygroundInner() {
  const { colorMode } = useColorMode();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Editor = (require('@monaco-editor/react') as typeof import('@monaco-editor/react')).default;

  const [code, setCode] = useState(DEFAULT_CODE);
  const [scat, setScat] = useState<ScatCategory[]>(['lit', 'id']);
  const [sinc, setSinc] = useState('');
  const [lang, setLang] = useState('js');
  const [lver, setLver] = useState('');
  const [prsr, setPrsr] = useState('@babel/parser');
  const [sourceType, setSourceType] = useState<'module' | 'script' | 'unambiguous'>('module');
  const [tree, setTree] = useState<AdapterNode | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [hideInactive, setHideInactive] = useState(false);
  const [selectedPathKey, setSelectedPathKey] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const csMastInitRef = useRef<CsMastInitFn | null>(null);
  const editorRef = useRef<MonacoEditor | null>(null);
  const treeRef = useRef<AdapterNode | null>(null);

  useEffect(() => {
    import('@shriyanss/cs-mast').then((mod) => {
      csMastInitRef.current = mod.cs_mast_init;
      reparse();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reparse = useCallback(() => {
    if (!csMastInitRef.current) return;

    const sincArr = sinc
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (scat.length === 0 && sincArr.length === 0) {
      setParseError('Select at least one scat category or enter a sinc node type.');
      setTree(null);
      treeRef.current = null;
      return;
    }

    const config: CsMastConfig = {
      hash: 'sha256',
      lang: lang.trim() || 'js',
      prsr: prsr.trim() || '@babel/parser',
      scat,
      sinc: sincArr,
      sourceType,
      ...(lver.trim() ? { lver: lver.trim() } : {}),
    };

    try {
      const result = csMastInitRef.current(code, config);
      setTree(result.root);
      treeRef.current = result.root;
      setParseError(null);
    } catch (e: unknown) {
      setParseError(e instanceof Error ? e.message : String(e));
      setTree(null);
      treeRef.current = null;
    }
  }, [code, scat, sinc, lang, lver, prsr, sourceType]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(reparse, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [reparse]);

  const handleEditorMount = useCallback((editor: MonacoEditor) => {
    editorRef.current = editor;

    editor.onDidChangeCursorSelection((e) => {
      const model = editor.getModel();
      if (!model || !treeRef.current) return;

      const sel = e.selection;
      const selStart = model.getOffsetAt({
        lineNumber: sel.startLineNumber,
        column: sel.startColumn,
      });
      const selEnd = model.getOffsetAt({
        lineNumber: sel.endLineNumber,
        column: sel.endColumn,
      });

      const found = findNodeAtOffset(treeRef.current, selStart, selEnd);
      setSelectedPathKey(found ? found.pathKey : null);
    });
  }, []);

  const toggleScat = (cat: ScatCategory) => {
    setScat((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  return (
    <div className={styles.playgroundPage}>
      <div className={styles.settingsBar}>
        <div className={styles.settingsGroup}>
          <span className={styles.settingsLabel}>scat</span>
          <div className={styles.scatCheckboxes}>
            {SCAT_CATEGORIES.map((cat) => (
              <label key={cat} className={styles.scatCheckbox}>
                <input
                  type="checkbox"
                  checked={scat.includes(cat)}
                  onChange={() => toggleScat(cat)}
                />
                {cat}
              </label>
            ))}
          </div>
        </div>
        <div className={styles.settingsGroup}>
          <span className={styles.settingsLabel}>sinc</span>
          <input
            className={styles.settingsInput}
            type="text"
            placeholder="IfStatement, ..."
            value={sinc}
            onChange={(e) => setSinc(e.target.value)}
          />
        </div>
        <div className={styles.settingsGroup}>
          <span className={styles.settingsLabel}>lang</span>
          <input
            className={styles.settingsInput}
            style={{ width: 50 }}
            type="text"
            value={lang}
            onChange={(e) => setLang(e.target.value)}
          />
        </div>
        <div className={styles.settingsGroup}>
          <span className={styles.settingsLabel}>lver</span>
          <input
            className={styles.settingsInput}
            style={{ width: 70 }}
            type="text"
            placeholder="es2022"
            value={lver}
            onChange={(e) => setLver(e.target.value)}
          />
        </div>
        <div className={styles.settingsGroup}>
          <span className={styles.settingsLabel}>prsr</span>
          <input
            className={styles.settingsInput}
            style={{ width: 130 }}
            type="text"
            value={prsr}
            onChange={(e) => setPrsr(e.target.value)}
          />
        </div>
        <div className={styles.settingsGroup}>
          <span className={styles.settingsLabel}>sourceType</span>
          <select
            className={styles.settingsSelect}
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value as typeof sourceType)}
          >
            <option value="module">module</option>
            <option value="script">script</option>
            <option value="unambiguous">unambiguous</option>
          </select>
        </div>
      </div>

      <div className={styles.splitPane}>
        <div className={styles.editorPane}>
          <Editor
            height="100%"
            defaultLanguage="javascript"
            value={code}
            onChange={(val) => setCode(val ?? '')}
            onMount={handleEditorMount}
            theme={colorMode === 'dark' ? 'vs-dark' : 'vs'}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              padding: { top: 8 },
            }}
          />
        </div>
        <div className={styles.treePane}>
          <div className={styles.treeFilterBar}>
            <label>
              <input
                type="checkbox"
                checked={hideInactive}
                onChange={(e) => setHideInactive(e.target.checked)}
              />
              {' '}Hide inactive nodes
            </label>
          </div>
          {parseError ? (
            <div className={styles.treeError}>{parseError}</div>
          ) : tree ? (
            <TreeNode
              node={tree}
              depth={0}
              hideInactive={hideInactive}
              selectedPathKey={selectedPathKey}
            />
          ) : (
            <div className={styles.treeEmpty}>
              Type some JavaScript to see the CS-MAST tree.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page entry point ─────────────────────────────────────────────────────────

export default function Playground(): React.ReactElement {
  return (
    <Layout
      title="Playground"
      description="Interactive CS-MAST tree explorer — type JavaScript and see the CS-MAST tree live"
      noFooter
    >
      <BrowserOnly fallback={<div style={{ padding: 24 }}>Loading playground…</div>}>
        {() => <PlaygroundInner />}
      </BrowserOnly>
    </Layout>
  );
}
