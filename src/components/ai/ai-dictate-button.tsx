'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Mic, Square, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AIDictateButtonProps {
  onTranscribe: (polished: string, suggestedSubject?: string) => void;
}

export function AIDictateButton({ onTranscribe }: AIDictateButtonProps) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setRecording(true);
      setDialogOpen(true);
      toast.success('Recording started. Click stop when done.');
    } catch (error) {
      console.error('Recording error:', error);
      toast.error('Failed to start recording. Please check microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setProcessing(true);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await fetch('/api/ai/dictate', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to transcribe audio');
      }

      const data = await response.json();
      onTranscribe(data.polished_email, data.suggested_subject);
      setDialogOpen(false);
      toast.success('Transcription complete!');
    } catch (error) {
      console.error('Transcription error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to transcribe audio');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={startRecording}
        disabled={recording || processing}
        title="Dictate email"
      >
        <Mic className="h-4 w-4" />
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Voice Dictation</DialogTitle>
            <DialogDescription>
              {recording && 'Recording in progress...'}
              {processing && 'Transcribing and polishing your email...'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-8">
            {recording && (
              <>
                <div className="relative">
                  <div className="h-24 w-24 rounded-full bg-red-500/20 flex items-center justify-center animate-pulse">
                    <Mic className="h-12 w-12 text-red-500" />
                  </div>
                  <div className="absolute inset-0 rounded-full border-4 border-red-500/30 animate-ping" />
                </div>
                <p className="text-sm text-muted-foreground">Listening...</p>
                <Button onClick={stopRecording} variant="destructive">
                  <Square className="mr-2 h-4 w-4" />
                  Stop Recording
                </Button>
              </>
            )}

            {processing && (
              <>
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Transcribing and polishing your email...
                </p>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
