import React, { useState, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Icon } from '@iconify/react';
import Notifikacija from './Notifikacija';
import ApiConfig from './apiConfig';
import '../styles/TipTap.css';
import Link from '@tiptap/extension-link';
import { Node } from '@tiptap/core';
import _ from 'lodash';

// Add this line to ensure credentials are sent with requests
ApiConfig.api.defaults.withCredentials = true;

const CustomDocument = Node.create({
  name: 'customDocument',
  group: 'inline',
  inline: true,
  selectable: true,
  atom: true,

  addAttributes() {
    return {
      href: {
        default: null
      },
      documentId: {
        default: null
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'a[data-document-link]',
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['a', { 
      ...HTMLAttributes,
      class: 'document-link',
      'data-document-link': '',
      target: '_blank',
      rel: 'noopener noreferrer'
    }, [
      'span', { class: 'document-icon' },
      ['i', { class: 'iconify', 'data-icon': 'solar:document-broken' }],
      ['span', {}, `Dokument ${HTMLAttributes.documentId}`]
    ]]
  }
});

// Tiptap Editor Component
const TiptapEditor = ({ content, onUpdate, editable }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      CustomDocument,
    ],
    content: content,
    editable: editable,
    editorProps: {
      attributes: {
        class: 'tiptap-editor',
      },
      handlePaste: (view, event) => {
        const text = event.clipboardData.getData('text/plain');
        const documentRegex = /https?:\/\/[^/]+\/documents\/([a-zA-Z0-9-]+)(?:\?[^/]*)?/;
        const match = text.match(documentRegex);

        if (match) {
          const documentId = match[1];
          const { tr } = view.state;
          const node = view.state.schema.nodes.customDocument.create({
            href: text,
            documentId: documentId
          });
          view.dispatch(tr.replaceSelectionWith(node));
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      if (onUpdate) {
        // Debounce the update to prevent rapid state changes
        setTimeout(() => {
          onUpdate(editor.getHTML());
        }, 100);
      }
    }
  });

  if (!editor) {
    return null;
  }

  return (
    <div className="tiptap-container" onClick={(e) => e.stopPropagation()}>
      <div className="tiptap-toolbar">
        <button
          type="button" // Prevent form submission
          onClick={(e) => {
            e.preventDefault();
            editor.chain().focus().toggleBold().run();
          }}
          className={`action-btn ${editor.isActive('bold') ? 'active' : ''}`}
        >
          <Icon icon="gravity-ui:bold" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            editor.chain().focus().toggleItalic().run();
          }}
          className={`action-btn ${editor.isActive('italic') ? 'active' : ''}`}
        >
          <Icon icon="gravity-ui:italic" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            editor.chain().focus().toggleStrike().run();
          }}
          className={`action-btn ${editor.isActive('strike') ? 'active' : ''}`}
        >
          <Icon icon="solar:text-cross-outline" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            editor.chain().focus().toggleHeading({ level: 1 }).run();
          }}
          className={`action-btn ${editor.isActive('heading', { level: 1 }) ? 'active' : ''}`}
        >
          <Icon icon="gravity-ui:heading-1" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            editor.chain().focus().toggleHeading({ level: 2 }).run();
          }}
          className={`action-btn ${editor.isActive('heading', { level: 2 }) ? 'active' : ''}`}
        >
          <Icon icon="gravity-ui:heading-2" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            editor.chain().focus().toggleBulletList().run();
          }}
          className={`action-btn ${editor.isActive('bulletList') ? 'active' : ''}`}
        >
          <Icon icon="gravity-ui:list-ul" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            editor.chain().focus().toggleOrderedList().run();
          }}
          className={`action-btn ${editor.isActive('orderedList') ? 'active' : ''}`}
        >
          <Icon icon="gravity-ui:list-ol" />
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
};

const PostEditorOpened = ({ post, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    title: post?.title || '',
    visibility: post?.visibility || 'public',
    showAllSchools: post?.showAllSchools || false
  });
  const [editorContent, setEditorContent] = useState(post?.content || '');
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const handleChange = (e) => {
    e.preventDefault();
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setHasUnsavedChanges(true);
  };

  const handleContentChange = useCallback((newContent) => {
    setEditorContent(newContent);
    setHasUnsavedChanges(true);
  }, []);

  const handleClose = (e) => {
    e?.preventDefault();
    if (hasUnsavedChanges) {
      if (window.confirm('Imate nespremljene promjene. Jeste li sigurni da želite zatvoriti?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleSave = async () => {    
    if (isSaving) return;

    setIsSaving(true);

    try {
      console.log('Updating existing post:', post.id);
      const response = await ApiConfig.api.put(`/api/posts-edit/${post.id}`, {
        ...formData,
        content: editorContent
      });

      setNotification({
        type: 'success',
        message: 'Objava uspješno ažurirana'
      });

      if (onSave) {
        onSave(response.data);
      }

      setHasUnsavedChanges(false);

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error updating post:', error);
      setNotification({
        type: 'error',
        message: error.response?.data?.message || 'Greška pri ažuriranju objave'
      });
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  return (
    <div className="popup" onClick={(e) => e.stopPropagation()}>
      <div
        style={{
          background: 'var(--iznad)',
          width: 'min(900px, 95vw)',
          maxHeight: '85vh',
          borderRadius: '12px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1.25rem',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            background: 'var(--pozadina)'
          }}
        >
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Uredi objavu</h2>
        </div>

        <div style={{ padding: '1rem 1.25rem', overflow: 'auto' }}>
          <div className="div">
            <input
              id="post-title"
              className="input-login-signup"
              type="text"
              value={formData.title}
              onChange={handleChange}
              name="title"
              required
              placeholder='Naslov'
            />
          </div>

          <div className="text-editor-container">
            <TiptapEditor
              content={post?.content}
              onUpdate={handleContentChange}
              editable={!isSaving}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="div" style={{ flex: 1 }}>
              <label htmlFor="post-visibility">Vidljivost objave:</label>
              <select
                id="post-visibility"
                className="input-login-signup"
                value={formData.visibility}
                onChange={handleChange}
                name="visibility"
              >
                <option value="public">Javno</option>
                <option value="mentor">Samo mentori</option>
                <option value="admin">Samo administratori</option>
              </select>
            </div>

            <div className="div-radio" style={{ flex: 1, alignItems: 'center', marginTop: '1.5rem' }}>
              <div
                className={`radio-item ${formData.showAllSchools ? 'checked' : ''}`}
                onClick={() => {
                  setFormData(prev => ({ ...prev, showAllSchools: !prev.showAllSchools }));
                  setHasUnsavedChanges(true);
                }}
              >
                <input
                  type="checkbox"
                  checked={formData.showAllSchools}
                  onChange={() => {
                    setFormData(prev => ({ ...prev, showAllSchools: !prev.showAllSchools }));
                    setHasUnsavedChanges(true);
                  }}
                  style={{ display: 'none' }}
                />
                Prikaži svim školama
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '.5rem',
            padding: '.75rem 1.25rem',
            borderTop: '1px solid rgba(255,255,255,0.08)'
          }}
        >
          <button
            type="button"
            className="gumb action-btn zatvoriBtn"
            onClick={handleClose}
            disabled={isSaving}
          >
            Odustani
          </button>
          <button
            type="button"
            className={`gumb action-btn spremiBtn ${hasUnsavedChanges ? 'has-changes' : ''}`}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Spremanje...' : 'Spremi'}
          </button>
        </div>
      </div>

      {notification && (
        <Notifikacija
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
};

export default PostEditorOpened;