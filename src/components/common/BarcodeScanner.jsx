/**
 * BarcodeScanner — Full-screen camera overlay that detects barcodes using Quagga2.
 * Supports EAN, UPC, Code 128, and Code 39 formats.
 *
 * @param {function} onScan  – called with the decoded barcode string
 * @param {function} onClose – called when the user dismisses the scanner
 */
import { useEffect, useRef, useCallback } from 'react'
import Quagga from '@ericblade/quagga2'
import { X } from 'lucide-react'

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
    <div className="fixed inset-0 bg-black/85 z-200 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg overflow-hidden w-full max-w-[400px]">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-200">
          <span className="text-[0.95rem] font-semibold">Scan Barcode</span>
          <button className="flex items-center justify-center text-gray-500 p-1 rounded-sm hover:bg-gray-100" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="relative w-full overflow-hidden [&_video]:!w-full [&_video]:!h-auto [&_video]:block [&_canvas]:!w-full [&_canvas]:!h-auto [&_canvas]:block [&_canvas.drawingBuffer]:absolute [&_canvas.drawingBuffer]:top-0 [&_canvas.drawingBuffer]:left-0" ref={scannerRef} />
        <p className="text-center py-3 text-xs text-gray-500">Point your camera at a barcode</p>
      </div>
    </div>
  )
}
