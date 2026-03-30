import React from 'react'
import { useDropzone } from 'react-dropzone'
import { useTranslation } from 'react-i18next'
import { CloudUpload } from 'lucide-react'
import { useNewDocumentStore } from '../../stores/new-document-store.js'

function UploadArea() {
  const { t } = useTranslation()
  const uploadReference = useNewDocumentStore(state => state.uploadReference)

  const onDrop = acceptedFiles => {
    acceptedFiles.forEach(file => uploadReference(file))
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
    },
    onDrop,
  })

  return (
    <div
      {...getRootProps()}
      data-testid="upload-area"
      className={`flex flex-col items-center border-2 border-dashed rounded-xl pt-6 py-8 px-6 cursor-pointer transition-colors ${
        isDragActive
          ? 'border-primary-400 bg-primary-50'
          : 'border-neutral-300 hover:border-primary-400 hover:bg-primary-50'
      }`}
    >
      <input {...getInputProps()} data-testid="upload-input" />
      <CloudUpload
        size={36}
        strokeWidth={1.5}
        className="text-primary-400 mb-3"
        data-testid="upload-icon"
      />
      <div className="text-base font-medium text-neutral-700 mb-1" data-testid="upload-title">
        {t('newDocument.uploadTitle')}
      </div>
      <div className="text-sm text-neutral-400" data-testid="upload-hint">
        {isDragActive ? t('newDocument.uploadDragActive') : t('newDocument.uploadHint')}
      </div>
    </div>
  )
}

export default UploadArea
