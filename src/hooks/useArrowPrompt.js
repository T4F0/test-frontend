import { useCallback, useEffect, useRef, useState } from 'react'
import { renderArrowTextBox } from '../lib/dicomTools'

/** State and callbacks behind the "name this arrow" prompt shown inside the DICOM viewer. */
export default function useArrowPrompt() {
  const [arrowPrompt, setArrowPrompt] = useState(null)
  const [arrowInputText, setArrowInputText] = useState('')
  const arrowInputRef = useRef(null)
  const promptArrowTextRef = useRef(null)

  promptArrowTextRef.current = (doneCallback, initialText = '', isEditing = false) => {
    setArrowInputText(initialText || '')
    setArrowPrompt({ doneCallback, initialText, isEditing })
  }

  useEffect(() => {
    if (arrowPrompt) {
      setTimeout(() => {
        arrowInputRef.current?.focus()
        arrowInputRef.current?.select()
      }, 60)
    }
  }, [arrowPrompt])

  const handleConfirmArrowNaming = useCallback((text) => {
    if (arrowPrompt?.doneCallback) {
      const trimmed = (text || '').trim() || 'Flèche'
      arrowPrompt.doneCallback(trimmed)
    }
    setArrowPrompt(null)
    setArrowInputText('')
  }, [arrowPrompt])

  const handleCancelArrowNaming = useCallback(() => {
    if (arrowPrompt?.doneCallback) {
      if (arrowPrompt.isEditing) {
        arrowPrompt.doneCallback(arrowPrompt.initialText || 'Flèche')
      } else {
        arrowPrompt.doneCallback(null)
      }
    }
    setArrowPrompt(null)
    setArrowInputText('')
  }, [arrowPrompt])

  const configureArrowInstance = useCallback((arrowInstance) => {
    if (!arrowInstance) return

    arrowInstance.configuration = {
      ...arrowInstance.configuration,
      arrowFirst: false,
      getTextCallback: (doneCallback) => {
        promptArrowTextRef.current?.(doneCallback, '', false)
      },
      changeTextCallback: (data, eventData, doneCallback) => {
        const currentLabel = data?.data?.label || data?.label || ''
        promptArrowTextRef.current?.(doneCallback, currentLabel, true)
      },
    }

    arrowInstance.renderLinkedTextBoxAnnotation = renderArrowTextBox
  }, [])

  return {
    arrowPrompt,
    arrowInputText,
    setArrowInputText,
    arrowInputRef,
    promptArrowTextRef,
    handleConfirmArrowNaming,
    handleCancelArrowNaming,
    configureArrowInstance,
  }
}
