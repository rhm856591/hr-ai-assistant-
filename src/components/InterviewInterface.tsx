'use client';

import React, { useState, useEffect, useRef } from 'react';
import Vapi from '@vapi-ai/web';
import { Camera, Mic, MicOff, Video, VideoOff, Phone, PhoneOff, Loader2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export default function InterviewInterface() {
    const [isCalling, setIsCalling] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [interviewConfig, setInterviewConfig] = useState<any>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const vapi = useRef<any>(null);

    // Audio Mixing Refs
    const audioContextRef = useRef<AudioContext | null>(null);
    const mixedDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
    const assistantSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

    useEffect(() => {
        if (!vapi.current) {
            vapi.current = new Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || '');
        }

        const v = vapi.current;

        // Fetch config and auto-setup media
        fetch('/api/config')
            .then(res => res.json())
            .then(data => setInterviewConfig(data))
            .catch(err => console.error('Failed to load config', err));

        setupMedia();

        // Vapi Event Listeners
        const onCallStart = () => {
            setIsCalling(true);
            setIsLoading(false);
        };

        const onCallEnd = () => {
            setIsCalling(false);
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
        };

        const onError = (error: any) => {
            console.error('Vapi Error:', error);
            setIsLoading(false);
            setIsCalling(false);
            const message = error?.message || (typeof error === 'string' ? error : 'Internal Vapi Error');
            alert(`Interview Error: ${message}`);
        };

        const onParticipantUpdated = (p: any) => {
            // If this is the assistant and they have an audio track
            if (!p.local && p.audioTrack && audioContextRef.current && mixedDestinationRef.current) {
                if (!assistantSourceRef.current) {
                    const source = audioContextRef.current.createMediaStreamSource(new MediaStream([p.audioTrack]));
                    source.connect(mixedDestinationRef.current);
                    assistantSourceRef.current = source;
                    console.log('Mixed Assistant audio into recording stream');
                }
            }
        };

        v.on('call-start', onCallStart);
        v.on('call-end', onCallEnd);
        v.on('error', onError);
        v.on('daily-participant-updated', onParticipantUpdated);

        return () => {
            v.off('call-start', onCallStart);
            v.off('call-end', onCallEnd);
            v.off('error', onError);
            v.off('daily-participant-updated', onParticipantUpdated);
            // Don't stop the call here unless explicitly needed, 
            // but we should cleanup listeners
        };
    }, []);

    const setupMedia = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
            return mediaStream;
        } catch (err) {
            console.error('Error accessing media devices:', err);
            alert('Please grant camera and microphone permissions to proceed.');
            return null;
        }
    };

    const handleStart = async () => {
        const mediaStream = stream || await setupMedia();
        if (mediaStream) {
            startInterview(mediaStream);
        }
    };

    const startInterview = async (mediaStream: MediaStream) => {
        if (!process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY) {
            alert('Vapi Public Key is missing. Please add it to your .env.local file.');
            return;
        }
        if (!interviewConfig) {
            alert('Interview configuration not loaded yet.');
            return;
        }

        setIsLoading(true);
        try {
            // Setup Audio Mixing
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            const ctx = audioContextRef.current;
            if (ctx.state === 'suspended') await ctx.resume();

            const dest = ctx.createMediaStreamDestination();
            mixedDestinationRef.current = dest;

            // Connect local mic to mixed destination
            const micSource = ctx.createMediaStreamSource(mediaStream);
            micSource.connect(dest);

            // Create combined stream for recording (Video from camera + Mixed Audio from destination)
            const recordingStream = new MediaStream([
                ...mediaStream.getVideoTracks(),
                ...dest.stream.getAudioTracks()
            ]);

            // Reset assistant source for new call
            assistantSourceRef.current = null;

            // Start Recording
            const recorder = new MediaRecorder(recordingStream, { mimeType: 'video/webm' });
            mediaRecorderRef.current = recorder;
            chunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            recorder.onstop = async () => {
                const blob = new Blob(chunksRef.current, { type: 'video/webm' });
                await uploadRecording(blob);
            };

            recorder.start();

            // Start Vapi Call
            console.log('Starting Vapi with Public Key:', process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY ? 'Present' : 'MISSING');

            await vapi.current.start({
                name: "Sarah - HR Recruiter",
                transcriber: {
                    provider: "deepgram",
                    model: "nova-2",
                    language: "en-US",
                },
                model: {
                    provider: "openai" as any,
                    model: "gpt-4o" as any,
                    messages: [
                        {
                            role: "system" as any,
                            content: interviewConfig.instructions
                        }
                    ],
                },
                voice: {
                    provider: "openai",
                    voiceId: "shimmer",
                },
                firstMessage: "Hi there! I'm Sarah from the HR team. Am I speaking with the candidate?",
            } as any);
        } catch (err: any) {
            console.error('Failed to start interview. Payload rejection details:');
            console.error(err);
            setIsLoading(false);
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
        }
    };

    const endInterview = () => {
        if (vapi.current) {
            vapi.current.stop();
        }
    };

    const uploadRecording = async (blob: Blob) => {
        const formData = new FormData();
        formData.append('video', blob, `interview_${Date.now()}.webm`);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (data.success) {
                console.log('Recording uploaded successfully');
            }
        } catch (err) {
            console.error('Failed to upload recording:', err);
        }
    };

    const toggleMute = () => {
        if (stream) {
            const tracks = stream.getAudioTracks();
            tracks.forEach(track => (track.enabled = isMuted));
            setIsMuted(!isMuted);
        }
    };

    const toggleVideo = () => {
        if (stream) {
            const tracks = stream.getVideoTracks();
            tracks.forEach(track => (track.enabled = isVideoOff));
            setIsVideoOff(!isVideoOff);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 space-y-8">
            <div className="text-center space-y-2">
                <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
                    The Autonomous Recruiter
                </h1>
                <p className="text-xl text-gray-400">
                    Sarah is ready to conduct your preliminary screening.
                </p>
            </div>

            <div className="relative w-full max-w-4xl aspect-video glass-card overflow-hidden group">
                {!stream && !isCalling && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4 z-10">
                        <div className="p-6 rounded-full bg-white/5 border border-white/10">
                            <Camera className="w-12 h-12 text-gray-400" />
                        </div>
                        <button
                            onClick={setupMedia}
                            disabled={isLoading}
                            className="px-6 py-3 rounded-xl bg-white text-black font-semibold hover:bg-gray-200 transition-colors flex items-center space-x-2"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Enable Camera & Mic</span>}
                        </button>
                    </div>
                )}

                <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className={cn(
                        "w-full h-full object-cover transition-opacity duration-500",
                        isVideoOff ? "opacity-0" : "opacity-100"
                    )}
                />

                {isVideoOff && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50">
                        <VideoOff className="w-20 h-20 text-gray-400" />
                    </div>
                )}

                {/* Overlay Controls */}
                {stream && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center space-x-4 px-6 py-3 rounded-2xl bg-black/40 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={toggleMute}
                            className={cn(
                                "p-3 rounded-full transition-colors",
                                isMuted ? "bg-red-500/20 text-red-500" : "bg-white/10 text-white hover:bg-white/20"
                            )}
                        >
                            {isMuted ? <MicOff /> : <Mic />}
                        </button>
                        <button
                            onClick={toggleVideo}
                            className={cn(
                                "p-3 rounded-full transition-colors",
                                isVideoOff ? "bg-red-500/20 text-red-500" : "bg-white/10 text-white hover:bg-white/20"
                            )}
                        >
                            {isVideoOff ? <VideoOff /> : <Video />}
                        </button>
                        <div className="w-px h-6 bg-white/20 mx-2" />
                        {!isCalling ? (
                            <button
                                onClick={handleStart}
                                disabled={isLoading || !interviewConfig || isMuted || isVideoOff}
                                className="flex items-center space-x-2 px-6 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 transition-all font-medium"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <Phone className="w-5 h-5" />
                                        <span>Start Interview</span>
                                    </>
                                )}
                            </button>
                        ) : (
                            <button
                                onClick={endInterview}
                                className="flex items-center space-x-2 px-6 py-2 rounded-xl bg-red-600 text-white hover:bg-red-500 transition-all font-medium"
                            >
                                <PhoneOff className="w-5 h-5" />
                                <span>End Interview</span>
                            </button>
                        )}
                    </div>
                )}

                {/* Call Status Indicator */}
                {isCalling && (
                    <div className="absolute top-6 right-6 flex items-center space-x-2 px-3 py-1.5 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-medium animate-pulse">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <span>LIVE RECORDING</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
                <div className="p-6 glass-card space-y-2">
                    <h3 className="font-semibold text-white">Persona</h3>
                    <p className="text-sm text-gray-400">Sarah, Professional HR Associate. Polite and efficient.</p>
                </div>
                <div className="p-6 glass-card space-y-2">
                    <h3 className="font-semibold text-white">Dynamic Script</h3>
                    <p className="text-sm text-gray-400">Loaded from instruction.md. No hardcoded questions.</p>
                </div>
                <div className="p-6 glass-card space-y-2">
                    <h3 className="font-semibold text-white">Auto-Storage</h3>
                    <p className="text-sm text-gray-400">Recording saved to local filesystem immediately after end.</p>
                </div>
            </div>
        </div>
    );
}
