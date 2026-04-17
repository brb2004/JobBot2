import React, { useRef, useState } from 'react';
import { Upload } from 'lucide-react';

interface ResumeInputProps {
  resumeText: string;
  setResumeText: (text: string) => void;
}

const ResumeInput: React.FC<ResumeInputProps> = ({ resumeText, setResumeText }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) setResumeText(text);
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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Resume</h2>
        <p className="text-gray-600">Paste your resume text or drag and drop a file below.</p>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <textarea
            className="w-full h-64 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
            placeholder="Paste your resume text here..."
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
          />
        </div>

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
            isDragging
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
          }`}
        >
          <Upload className={`w-8 h-8 mb-2 ${isDragging ? 'text-blue-400' : 'text-gray-400'}`} />
          <p className="text-sm text-gray-500">
            {isDragging ? 'Drop file here' : 'Drag & drop or click to upload'}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".txt,.md,.pdf,.doc,.docx"
            onChange={handleFileChange}
          />
        </div>
      </div>
    </div>
  );
};

export default ResumeInput;
