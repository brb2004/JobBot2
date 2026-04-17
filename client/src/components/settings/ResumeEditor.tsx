import React, { useRef, useState } from 'react';
import { FileText, Save, CheckCircle, AlertCircle, Loader2, Upload } from 'lucide-react';

interface ResumeEditorProps {
  resume: string;
  setResume: (resume: string) => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
  saveStatus: 'idle' | 'success' | 'error';
}

const ResumeEditor: React.FC<ResumeEditorProps> = ({
  resume,
  setResume,
  onSave,
  isSaving,
  saveStatus,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) setResume(text);
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) readFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) readFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-2 border-b border-slate-200 pb-4">
        <FileText className="w-5 h-5 text-slate-400" />
        <h2 className="text-xl font-semibold text-slate-900">Master Resume</h2>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-6">
        <p className="text-sm text-slate-500">
          Your master resume is used as the basis for all generated variations. Paste or edit the
          markdown content below, or drag and drop a file to replace it.
        </p>

        <textarea
          className="w-full h-96 p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-sm resize-none"
          value={resume}
          onChange={(e) => setResume(e.target.value)}
          placeholder="Paste your resume in markdown format here..."
        />

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`flex items-center justify-center gap-3 w-full h-16 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
            isDragging
              ? 'border-indigo-400 bg-indigo-50'
              : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
          }`}
        >
          <Upload className={`w-5 h-5 ${isDragging ? 'text-indigo-400' : 'text-slate-400'}`} />
          <span className="text-sm text-slate-500">
            {isDragging ? 'Drop to replace resume' : 'Drag & drop a file to replace resume'}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".txt,.md,.pdf,.doc,.docx"
            onChange={handleFileChange}
          />
        </div>

        <div className="flex justify-end items-center gap-4">
          {saveStatus === 'success' && (
            <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
              <CheckCircle className="w-4 h-4" /> Saved
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="flex items-center gap-1 text-red-600 text-sm font-medium">
              <AlertCircle className="w-4 h-4" /> Error saving
            </div>
          )}
          <button
            onClick={onSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Resume
          </button>
        </div>
      </div>
    </section>
  );
};

export default ResumeEditor;
