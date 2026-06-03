import { useEffect, useMemo, useRef, useState } from 'react';
import { SuperDoc } from 'superdoc';
import SuperDocTemplateBuilder from '@superdoc-dev/template-builder';
import SuperDocESign from '@superdoc-dev/esign';
import { AIActions } from '@superdoc-dev/ai';
import type { SuperDocTemplateBuilderHandle } from '@superdoc-dev/template-builder';
import 'superdoc/style.css';
import './App.css';

type Tab = 'editor' | 'templates' | 'esign' | 'ai';

const DOCUMENT_URL =
  'https://storage.googleapis.com/public_static_hosting/public_demo_docs/service_agreement.docx';

const templateFields = [
  { id: 'party_a', label: 'Party A' },
  { id: 'party_b', label: 'Party B' },
  { id: 'effective_date', label: 'Effective Date' },
  { id: 'jurisdiction', label: 'Jurisdiction' },
  { id: 'contract_value', label: 'Contract Value' },
];

function EditorTab() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [collaborationEnabled, setCollaborationEnabled] = useState(false);
  const [collaborationUrl, setCollaborationUrl] = useState('ws://localhost:3050/collaboration');

  useEffect(() => {
    if (!hostRef.current) return;

    hostRef.current.innerHTML = '';
    const node = document.createElement('div');
    node.id = 'legal-superdoc-editor';
    node.style.height = '520px';
    hostRef.current.appendChild(node);

    const superdoc = new SuperDoc({
      selector: '#legal-superdoc-editor',
      toolbar: '#legal-superdoc-editor-toolbar',
      documentMode: 'editing',
      pagination: true,
      document: { id: 'legal-doc', type: 'docx', url: DOCUMENT_URL },
      layoutEngineOptions: {
        trackedChanges: {
          enabled: true,
          mode: 'review',
        },
      },
      ...(collaborationEnabled
        ? {
            modules: {
              collaboration: {
                url: collaborationUrl,
                token: 'legal-team-token',
              },
            },
          }
        : {}),
    });

    return () => {
      superdoc.destroy();
    };
  }, [collaborationEnabled, collaborationUrl]);

  return (
    <div className='editor-shell'>
      <div className='row'>
        <label>
          <input
            type='checkbox'
            checked={collaborationEnabled}
            onChange={(e) => setCollaborationEnabled(e.target.checked)}
          />{' '}
          Enable collaboration-yjs endpoint
        </label>
        <input
          value={collaborationUrl}
          onChange={(e) => setCollaborationUrl(e.target.value)}
          style={{ minWidth: 320 }}
          disabled={!collaborationEnabled}
        />
      </div>
      <div id='legal-superdoc-editor-toolbar' />
      <div className='editor-host' ref={hostRef} />
    </div>
  );
}

function TemplatesTab() {
  const ref = useRef<SuperDocTemplateBuilderHandle>(null);

  return (
    <div className='editor-shell'>
      <div className='row'>
        <span>Type {'{{'} to insert legal fields.</span>
        <button
          onClick={() => ref.current?.exportTemplate({ fileName: 'legal-contract-template.docx' })}
        >
          Export DOCX Template
        </button>
      </div>
      <SuperDocTemplateBuilder
        ref={ref}
        document={{ source: DOCUMENT_URL, mode: 'editing' }}
        fields={{ available: templateFields, allowCreate: true }}
        list={{ position: 'right' }}
        toolbar={true}
        documentHeight='560px'
      />
    </div>
  );
}

function ESignTab() {
  const [eventSummary, setEventSummary] = useState<string>('No signing event yet.');

  return (
    <div className='editor-shell'>
      <SuperDocESign
        eventId={`legal-${Date.now()}`}
        document={{
          source: DOCUMENT_URL,
          mode: 'full',
          validation: { scroll: { required: true } },
        }}
        fields={{
          document: [
            { id: 'party_a', value: 'Acme Corp' },
            { id: 'party_b', value: 'Globex LLC' },
            { id: 'jurisdiction', value: 'California, USA' },
          ],
          signer: [
            {
              id: 'signature',
              type: 'signature',
              validation: { required: true },
              label: 'Sign full legal name',
            },
            {
              id: 'accept_terms',
              type: 'checkbox',
              validation: { required: true },
              label: 'I accept the legal terms and compliance policy',
            },
          ],
        }}
        onSubmit={(data) => {
          setEventSummary(
            `Submitted event ${data.eventId} at ${new Date(data.timestamp).toISOString()} with ${data.auditTrail.length} audit events.`,
          );
          console.log('ESign submit payload:', data);
        }}
        documentHeight='560px'
      />
      <div className='summary'>{eventSummary}</div>
    </div>
  );
}

function AITab() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const superdocRef = useRef<SuperDoc | null>(null);
  const aiRef = useRef<AIActions | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState('Load editor, add API key, then run actions.');

  useEffect(() => {
    if (!hostRef.current) return;

    hostRef.current.innerHTML = '';
    const node = document.createElement('div');
    node.id = 'legal-ai-editor';
    node.style.height = '520px';
    hostRef.current.appendChild(node);

    const superdoc = new SuperDoc({
      selector: '#legal-ai-editor',
      toolbar: '#legal-ai-editor-toolbar',
      documentMode: 'editing',
      pagination: true,
      document: { id: 'legal-ai', type: 'docx', url: DOCUMENT_URL },
      layoutEngineOptions: {
        trackedChanges: {
          enabled: true,
          mode: 'review',
        },
      },
    });

    superdocRef.current = superdoc;

    return () => {
      aiRef.current = null;
      superdoc.destroy();
      superdocRef.current = null;
    };
  }, []);

  const canRun = useMemo(() => !!aiRef.current, [status]);

  const initAI = async () => {
    if (!superdocRef.current || !apiKey.trim()) {
      setStatus('Provide API key to initialize AI legal review.');
      return;
    }

    aiRef.current = new AIActions(superdocRef.current, {
      user: { displayName: 'Legal AI', userId: 'legal-ai' },
      provider: {
        type: 'openai',
        apiKey,
        model: 'gpt-4o-mini',
      },
      systemPrompt:
        'You are a legal document assistant. Focus on contracts, compliance, clarity, and risk exposure. Use tracked changes for edits and comments for legal rationale.',
      onReady: () => setStatus('AI legal review is ready.'),
      onError: (error) => setStatus(`AI error: ${error.message}`),
    });

    try {
      setStatus('Initializing AI...');
      await aiRef.current.waitUntilReady();
      setStatus('AI legal review is ready.');
    } catch (error) {
      setStatus(`AI initialization failed: ${(error as Error).message}`);
    }
  };

  const runAction = async (action: () => Promise<unknown>, doneMessage: string) => {
    if (!aiRef.current) {
      setStatus('Initialize AI first.');
      return;
    }
    setStatus('Running AI action...');
    try {
      await action();
      setStatus(doneMessage);
    } catch (error) {
      setStatus(`AI action failed: ${(error as Error).message}`);
    }
  };

  return (
    <div className='editor-shell'>
      <div className='row'>
        <input
          type='password'
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder='OpenAI API key (client-side demo only)'
          style={{ minWidth: 360 }}
        />
        <button onClick={initAI}>Initialize AI</button>
        <button
          disabled={!canRun}
          onClick={() =>
            runAction(
              () =>
                aiRef.current!.action.insertTrackedChanges(
                  'Redline this contract to tighten indemnity language and liability caps.',
                ),
              'Tracked changes inserted.',
            )
          }
        >
          Insert Tracked Changes
        </button>
        <button
          disabled={!canRun}
          onClick={() =>
            runAction(
              () =>
                aiRef.current!.action.insertComments(
                  'Add compliance comments for GDPR, confidentiality, and jurisdiction risks.',
                ),
              'Compliance comments inserted.',
            )
          }
        >
          Insert Comments
        </button>
        <button
          disabled={!canRun}
          onClick={() =>
            runAction(
              () => aiRef.current!.action.highlight('Find and highlight all jurisdiction clauses.'),
              'Jurisdiction clauses highlighted.',
            )
          }
        >
          Highlight Clauses
        </button>
        <button
          disabled={!canRun}
          onClick={() =>
            runAction(
              () => aiRef.current!.action.summarize('Generate an executive legal summary.'),
              'Summary generated.',
            )
          }
        >
          Summarize
        </button>
      </div>
      <div id='legal-ai-editor-toolbar' />
      <div className='editor-host' ref={hostRef} />
      <div className='summary'>{status}</div>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('editor');

  return (
    <div className='layout'>
      <h1>SuperDoc Legal Workflow Integration</h1>
      <p>
        End-to-end legal setup using SuperDoc core editing, templates, e-sign/compliance, AI review, and
        collaboration-ready configuration.
      </p>

      <div className='tabs'>
        {([
          ['editor', '1) Editing + Collaboration'],
          ['templates', '2) Contract Templates'],
          ['esign', '3) E-Sign + Compliance'],
          ['ai', '4) AI Legal Review'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            className={`tab ${activeTab === key ? 'active' : ''}`}
            onClick={() => setActiveTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className='panel'>
        {activeTab === 'editor' && <EditorTab />}
        {activeTab === 'templates' && <TemplatesTab />}
        {activeTab === 'esign' && <ESignTab />}
        {activeTab === 'ai' && <AITab />}
      </div>

      <div className='panel notes'>
        <strong>Developer tooling / plugins</strong>
        <ul>
          <li>
            Microsoft Word plugin sample: <code>examples/integrations/word-addin</code>
          </li>
          <li>
            VS Code DOCX editor extension: <code>apps/vscode-ext</code>
          </li>
          <li>
            Collaboration backend package: <code>packages/collaboration-yjs</code>
          </li>
        </ul>
      </div>
    </div>
  );
}
