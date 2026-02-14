'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Vapi from '@vapi-ai/web';
import { useSearchParams } from 'next/navigation';
import { Camera, Mic, MicOff, Video, VideoOff, Phone, PhoneOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

function InterviewContent() {
    const searchParams = useSearchParams();
    const email = searchParams.get('email');
    const jdId = searchParams.get('jdId');

    const [isCalling, setIsCalling] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [verificationError, setVerificationError] = useState<string | null>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [interviewConfig, setInterviewConfig] = useState<any>(null);
    const [feedbackData, setFeedbackData] = useState<any>(null);
    const [isInterviewEnded, setIsInterviewEnded] = useState(false);

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

        // Verify and Fetch config
        if (!email || !jdId) {
            setVerificationError('Invalid interview link. Missing credentials.');
            setIsLoading(false);
            return;
        }

        fetch(`/api/config?email=${encodeURIComponent(email)}&jdId=${encodeURIComponent(jdId)}`)
            .then(async res => {
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Verification failed');
                setInterviewConfig(data);
                setIsLoading(false);
            })
            .catch(err => {
                console.error('Verification failed', err);
                setVerificationError(err.message);
                setIsLoading(false);
            });

        setupMedia();

        // Vapi Event Listeners
        const onCallStart = () => {
            setIsCalling(true);
            setIsLoading(false);
            setIsInterviewEnded(false);
            setFeedbackData(null);
        };

        const onCallEnd = () => {
            setIsCalling(false);
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
            // Transition to result screen ONLY after the call actually stops
            setIsInterviewEnded(true);
        };

        const onMessage = async (message: any) => {
            console.log('Vapi Message:', message);

            // Handle Tool Calls
            if (message.type === 'tool-calls') {
                const toolCall = message.toolCalls[0];
                if (toolCall.function.name === 'submit_interview_summary') {
                    try {
                        const args = typeof toolCall.function.arguments === 'string'
                            ? JSON.parse(toolCall.function.arguments)
                            : toolCall.function.arguments;

                        console.log('Interview Summary Received:', args);
                        setFeedbackData(args);

                        // 1. Send feedback result back (System message to stop further talking)
                        vapi.current.send({
                            type: 'tool-call-result',
                            toolCallId: toolCall.id,
                            result: 'JSON_SUBMITTED_SILENTLY. DO NOT SPEAK FURTHER. DISCONNECTING.'
                        });

                        // 2. Save feedback to API
                        const feedbackBody = {
                            candidateName: args.candidate_name || interviewConfig?.candidateName || 'Candidate',
                            feedback: args
                        };
                        console.log('Saving feedback to API:', feedbackBody);

                        await fetch('/api/feedback', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(feedbackBody),
                        });

                        // 3. Wait 8 seconds to allow a complete audio buffer flush
                        setTimeout(() => {
                            if (vapi.current) vapi.current.stop();
                        }, 8000);

                    } catch (err) {
                        console.error('Failed to process tool call result:', err);
                    }
                }
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
        v.on('message', onMessage);
        v.on('error', onError);
        v.on('daily-participant-updated', onParticipantUpdated);

        return () => {
            v.off('call-start', onCallStart);
            v.off('call-end', onCallEnd);
            v.off('message', onMessage);
            v.off('error', onError);
            v.off('daily-participant-updated', onParticipantUpdated);
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
                name: "HR Sarah Interview", // Changed name
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
                    tools: [
                        {
                            type: "function",
                            function: {
                                name: "submit_interview_summary",
                                description: "Submit the final JSON summary of the interview. Call this only when the interview is complete.",
                                parameters: {
                                    type: "object",
                                    properties: {
                                        candidate_name: { type: "string" },
                                        current_role: { type: "string" },
                                        primary_domain: { type: "string" },
                                        core_tech_stack: { type: "array", items: { type: "string" } },
                                        notice_period: { type: "string" },
                                        current_location: { type: "string" },
                                        comfortable_relocating: { type: "boolean" },
                                        current_ctc: { type: "string" },
                                        expected_ctc: { type: "string" },
                                        soft_skills_assessment: {
                                            type: "object",
                                            properties: {
                                                honesty: { type: "string" },
                                                integrity: { type: "string" },
                                                commitment: { type: "string" },
                                                confidence_level: { type: "string", enum: ["Low", "Medium", "High"] },
                                                communication_skills: { type: "string", enum: ["Below Average", "Average", "Above Average", "Excellent"] }
                                            }
                                        },
                                        overall_summary: { type: "string" },
                                        hiring_recommendation: { type: "string", enum: ["Strong Hire", "Hire", "Neutral", "Do Not Hire"] }
                                    },
                                    required: ["candidate_name", "overall_summary", "hiring_recommendation"]
                                }
                            }
                        }
                    ]
                },
                voice: {
                    provider: "openai",
                    voiceId: "shimmer",
                },
                firstMessage: `Hi! I'm Sarah. I'm excited to talk with you today. Let's begin the screening.`,
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

    if (isInterviewEnded) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 space-y-8 max-w-2xl mx-auto text-center">
                <div className="space-y-4 animate-in fade-in zoom-in duration-1000">
                    <div className="mx-auto w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30">
                        <CheckCircle2 className="w-10 h-10 text-green-400" />
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                        Interview Completed
                    </h1>
                    <p className="text-xl text-gray-400 leading-relaxed">
                        Thank you for your time, {feedbackData?.candidate_name || 'Candidate'}. Your responses and the video session have been successfully recorded.
                    </p>
                </div>

                <div className="w-full h-px bg-white/10" />

                <div className="grid grid-cols-1 gap-4 w-full text-left animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
                    <div className="p-6 glass-card space-y-2">
                        <h3 className="font-semibold text-white">What Happens Next?</h3>
                        <p className="text-sm text-gray-400">
                            Our hiring team will review your profile and video screening session. If your profile matches our requirements, we will contact you via email to schedule a technical round.
                        </p>
                    </div>

                    <div className="p-6 glass-card space-y-2">
                        <h3 className="font-semibold text-white">Confirmation</h3>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 uppercase tracking-tighter font-mono">
                                ID: {Date.now().toString().slice(-8)}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 uppercase tracking-tighter">
                                Status: Recorded
                            </span>
                        </div>
                    </div>
                </div>

                <div className="pt-4 flex flex-col items-center space-y-4">
                    <button
                        onClick={() => window.location.reload()}
                        className="px-8 py-3 rounded-xl bg-white text-black font-semibold hover:bg-gray-200 transition-all shadow-xl shadow-white/5"
                    >
                        Return to Dashboard
                    </button>
                    <p className="text-[10px] text-gray-600 italic">
                        The internal assessment has been securely delivered to the recruiting manager.
                    </p>
                </div>
            </div>
        );
    }

    if (verificationError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 space-y-4 text-center">
                <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20">
                    <AlertCircle className="w-12 h-12 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-white">Access Denied</h2>
                <p className="text-gray-400 max-w-md">{verificationError}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-4 px-6 py-2 rounded-xl bg-white/5 text-white hover:bg-white/10 transition-colors border border-white/10"
                >
                    Retry Verification
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 space-y-8">
            <div className="text-center space-y-2">
                <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl animate-in fade-in duration-1000">
                    {interviewConfig ? `Welcome, ${interviewConfig.candidateName}` : 'Preparing Interview...'}
                </h1>
                <p className="text-xl text-gray-400">
                    {interviewConfig
                        ? `Sarah is ready to discuss the ${interviewConfig.roleName} role with you.`
                        : 'Please wait while we verify your invitation...'}
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
                            className="px-6 py-3 rounded-xl bg-white text-black font-semibold hover:bg-gray-200 transition-colors flex items-center space-x-2 shadow-xl shadow-white/10"
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
                    <p className="text-sm text-gray-400">Sarah, {interviewConfig?.companyName || 'HR'} Associate. Polite and efficient.</p>
                </div>
                <div className="p-6 glass-card space-y-2">
                    <h3 className="font-semibold text-white">JD Focused</h3>
                    <p className="text-sm text-gray-400">Questions tailored to {interviewConfig?.roleName || 'the role'}.</p>
                </div>
                <div className="p-6 glass-card space-y-2">
                    <h3 className="font-semibold text-white">Auto-Storage</h3>
                    <p className="text-sm text-gray-400">Recording & Feedback saved to local filesystem immediately after end.</p>
                </div>
            </div>
        </div>
    );
}

export default function InterviewInterface() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-screen text-white space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
                <p className="text-gray-400 animate-pulse">Loading Interview Workspace...</p>
            </div>
        }>
            <InterviewContent />
        </Suspense>
    );
}
