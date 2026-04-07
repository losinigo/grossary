import { useEffect, useRef, useCallback } from 'react'
import Quagga from '@ericblade/quagga2'
import { X } from 'lucide-react'
import './BarcodeScanner.css'

export default function BarcodeScanner({ onScan, onClose }) {
  const scannerRef = useRef(null)
  const detectedRef = useRef(false)

  const handleDetected = useCallback((result) => {
    if (detectedRef.current) return
    const code = result?.codeResult?.code
    if (!code) return
    detectedRef.current = true
    Quagga.stop()
    onScan(code)
  }, [onScan])

  useEffect(() => {
    Quagga.init(
      {
        inputStream: {
          type: 'LiveStream',
          target: scannerRef.current,
          constraints: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        decoder: {
          readers: [
            'ean_reader',
            'ean_8_reader',
            'upc_reader',
            'upc_e_reader',
            'code_128_reader',
            'code_39_reader',
          ],
        },
        locate: true,
        frequency: 15,
      },
      (err) => {
        if (err) {
          console.error('Quagga init error:', err)
          onClose()
          return
        }
        Quagga.start()
      },
    )

    Quagga.onDetected(handleDetected)

    return () => {
      Quagga.offDetected(handleDetected)
      Quagga.stop()
    }
  }, [handleDetected, onClose])

  return (
    <div className="scanner-overlay">
      <div className="scanner-container">
        <div className="scanner-header">
          <span className="scanner-title">Scan Barcode</span>
          <button className="scanner-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="scanner-viewport" ref={scannerRef} />
        <p className="scanner-hint">Point your camera at a barcode</p>
      </div>
    </div>
  )
}
