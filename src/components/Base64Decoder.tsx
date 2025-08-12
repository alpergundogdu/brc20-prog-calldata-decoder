
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

// Lazy load dependencies to avoid bundle bloat
const loadZstd = async () => {
  const { decompress } = await import('@bokuweb/zstd-wasm');
  return decompress;
};

const loadNada = async () => {
  const { decode } = await import('@bestinslot/nada');
  return decode;
};


export const Base64Decoder: React.FC = () => {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<{
    compressionType: string;
    hexData: string;
    originalSize: number;
    decodedSize: number;
  } | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const bytesToHex = (bytes: Uint8Array): string => {
    return Array.from(bytes)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join(' ')
      .toUpperCase();
  };

  const decodeBase64 = async () => {
    if (!input.trim()) {
      setError('Please enter a base64 string');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      // Decode base64
      const binaryString = atob(input.trim());
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      if (bytes.length === 0) {
        setError('Invalid base64 data');
        return;
      }

      const firstByte = bytes[0];
      const dataWithoutMarker = bytes.slice(1);
      
      let compressionType: string;
      let decodedData: Uint8Array;

      switch (firstByte) {
        case 0x00:
          // Uncompressed
          compressionType = 'Uncompressed (0x00)';
          decodedData = dataWithoutMarker;
          break;

        case 0x01:
          // NADA compression
          compressionType = 'NADA (0x01)';
          try {
            const decode = await loadNada();
            decodedData = decode(dataWithoutMarker);
          } catch (nadaError) {
            setError(`NADA decompression error: ${nadaError}`);
            decodedData = dataWithoutMarker;
          }
          break;

        case 0x02:
          // ZSTD compression
          compressionType = 'ZSTD (0x02)';
          try {
            const decompress = await loadZstd();
            decodedData = decompress(dataWithoutMarker);
          } catch (zstdError) {
            setError(`ZSTD decompression error: ${zstdError}`);
            decodedData = dataWithoutMarker;
          }
          break;

        default:
          compressionType = `Unknown (0x${firstByte.toString(16).padStart(2, '0').toUpperCase()})`;
          decodedData = dataWithoutMarker;
          setError(`Unknown compression marker: 0x${firstByte.toString(16).padStart(2, '0').toUpperCase()}`);
          break;
      }

      setResult({
        compressionType,
        hexData: bytesToHex(decodedData),
        originalSize: input.trim().length, // Length of base64 string
        decodedSize: decodedData.length
      });

    } catch (err) {
      setError(`Decoding error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>BRC2.0 - Base64 Calldata Decoder</CardTitle>
          <CardDescription>
            Decode base64 strings and handle different compression formats based on the first byte marker
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="base64-input" className="text-sm font-medium">
              Base64 Input
            </label>
            <Input
              id="base64-input"
              placeholder="Enter base64 encoded string..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="font-mono"
            />
          </div>
          
          <Button 
            onClick={decodeBase64} 
            disabled={loading || !input.trim()}
            className="w-full"
          >
            {loading ? 'Decoding...' : 'Decode'}
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Decoded Result
              <Badge variant="secondary">{result.compressionType}</Badge>
            </CardTitle>
            <CardDescription>
              Original size: {result.originalSize} bytes | Decoded size: {result.decodedSize} bytes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <label className="text-sm font-medium">Hex Data</label>
              <Textarea
                value={result.hexData}
                readOnly
                className="font-mono text-sm min-h-[200px]"
                placeholder="Decoded hex data will appear here..."
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Compression Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="outline">0x00</Badge>
              <span>Uncompressed data</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">0x01</Badge>
              <span>NADA compression</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">0x02</Badge>
              <span>ZSTD compression</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
