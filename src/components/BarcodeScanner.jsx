import { useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { X } from 'lucide-react'
import './BarcodeScanner.css'

export default function BarcodeScanner({ onScan, onClose }) {
  const scannerRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    const scanner = new Html5Qrcode('barcode-reader')
    scannerRef.current = scanner

    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 150 } },
      (decodedText) => {
        scanner.stop().catch(() => {})
        onScan(decodedText)
      },
      () => {},
    ).catch(() => {
      onClose()
    })

    return () => {
      scanner.stop().catch(() => {})
    }
  }, [onScan, onClose])

  return (
    <div className="scanner-overlay">
      <div className="scanner-container">
        <div className="scanner-header">
          <span className="scanner-title">Scan Barcode</span>
          <button className="scanner-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div id="barcode-reader" ref={containerRef} />
        <p className="scanner-hint">Point your camera at a barcode</p>
      </div>
    </div>
  )
}
