"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Download, DownloadCloud, Pause, Play, StopCircle, Camera } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function VideoRecorder() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const [recording, setRecording] = useState(false)
  const [autoRecording, setAutoRecording] = useState(false)
  const [countdown, setCountdown] = useState(3) // Changed from 5 to 3
  const [recordedClips, setRecordedClips] = useState<string[]>([])
  const [progress, setProgress] = useState(0)
  const [clipCount, setClipCount] = useState(0)
  const [clipNamePrefix, setClipNamePrefix] = useState("clip")
  const chunksRef = useRef<Blob[]>([])

  // Initialize camera
  useEffect(() => {
    let mounted = true

    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        })

        if (mounted && videoRef.current) {
          videoRef.current.srcObject = stream
          // Force a re-render to update button states
          setRecording(false)
        }
      } catch (err) {
        console.error("Error accessing camera:", err)
        alert("Camera access failed. Please check your permissions and try again.")
      }
    }

    setupCamera()

    return () => {
      mounted = false
      // Clean up stream when component unmounts
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
      videoRef.current.srcObject = null

      // Reset states
      setRecording(false)
      setAutoRecording(false)
      setRecordedClips([])
      setClipCount(0)
    }
  }

  // Handle recording logic
  const startRecording = () => {
    if (!videoRef.current?.srcObject) {
      alert("Camera not available. Please refresh and allow camera access.")
      return
    }

    chunksRef.current = []
    const stream = videoRef.current.srcObject as MediaStream
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: "video/webm", // We'll convert to MP4 when downloading
    })

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data)
      }
    }

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" })
      const url = URL.createObjectURL(blob)
      setRecordedClips((prev) => [...prev, url])
      setClipCount((prev) => prev + 1)

      // If auto-recording is enabled, start the next recording
      if (autoRecording) {
        setTimeout(() => {
          startRecording()
        }, 500) // Small delay between recordings
      }
    }

    mediaRecorderRef.current = mediaRecorder
    mediaRecorder.start()
    setRecording(true)
    setCountdown(3) // Changed from 5 to 3
    setProgress(0)

    // Set up the timer to stop recording after 3 seconds
    const interval = setInterval(() => {
      setCountdown((prev) => {
        const newValue = prev - 1
        setProgress((3 - newValue) * 33.33) // Adjusted for 3 seconds (100/3 ≈ 33.33)
        return newValue
      })
    }, 1000)

    setTimeout(() => {
      clearInterval(interval)
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop()
        setRecording(false)
      }
    }, 3000) // Changed from 5000 to 3000
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop()
      setRecording(false)
      setAutoRecording(false)
    }
  }

  const toggleAutoRecording = () => {
    if (!autoRecording) {
      setAutoRecording(true)
      if (!recording) {
        startRecording()
      }
    } else {
      setAutoRecording(false)
      stopRecording()
    }
  }

  const downloadClip = (url: string, index: number) => {
    const a = document.createElement("a")
    a.href = url
    a.download = `${clipNamePrefix}${index + 1}.mp4` // Changed from webm to mp4
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const downloadAllClips = () => {
    recordedClips.forEach((url, i) => downloadClip(url, i))
  }

  const handleNamePrefixChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setClipNamePrefix(e.target.value || "clip")
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-6 w-6" />
            Automatic Video Dataset Recorder
          </CardTitle>
          <CardDescription>Records 3-second clips automatically for your dataset</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            {recording && (
              <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full flex items-center gap-1">
                <span className="animate-pulse h-2 w-2 bg-white rounded-full"></span>
                Recording: {countdown}s
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Recording progress</span>
              <span>{recording ? `${3 - countdown}s / 3s` : "0s / 3s"}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="grid gap-4">
            <div className="flex flex-wrap gap-2">
              <div className="text-sm font-medium">Total clips recorded: {clipCount}</div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="clip-name">Clip Name Prefix</Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="clip-name"
                  type="text"
                  placeholder="Enter clip name prefix"
                  value={clipNamePrefix}
                  onChange={handleNamePrefixChange}
                  className="max-w-xs"
                />
                <div className="text-sm text-muted-foreground">
                  Will save as: {clipNamePrefix}1.mp4, {clipNamePrefix}2.mp4, ...
                </div>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2 justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={autoRecording ? "destructive" : "default"}
              onClick={toggleAutoRecording}
              disabled={recording && !autoRecording}
            >
              {autoRecording ? (
                <>
                  <Pause className="mr-2 h-4 w-4" />
                  Stop Auto Recording
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Start Auto Recording
                </>
              )}
            </Button>

            {!autoRecording && (
              <>
                <Button variant="outline" onClick={startRecording} disabled={recording}>
                  <Camera className="mr-2 h-4 w-4" />
                  Record Once
                </Button>

                {recording && (
                  <Button variant="destructive" onClick={stopRecording}>
                    <StopCircle className="mr-2 h-4 w-4" />
                    Stop Recording
                  </Button>
                )}
              </>
            )}
          </div>

          <Button variant="secondary" onClick={stopCamera} className="ml-auto">
            <StopCircle className="mr-2 h-4 w-4" />
            Stop Camera
          </Button>
        </CardFooter>
      </Card>

      {recordedClips.length > 0 && (
        <Card className="max-w-3xl mx-auto mt-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recorded Clips</CardTitle>
              <CardDescription>Your most recent clips are shown below. Click to download.</CardDescription>
            </div>
            <Button variant="outline" onClick={downloadAllClips} className="flex items-center gap-2">
              <DownloadCloud className="h-4 w-4" />
              Download All Clips
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {recordedClips.map((url, index) => (
                <div key={index} className="relative aspect-video bg-black rounded-lg overflow-hidden group">
                  <video src={url} className="w-full h-full object-cover" controls />
                  <div className="absolute bottom-2 left-2 right-2 flex justify-between">
                    <div className="bg-black/70 text-white text-xs px-2 py-1 rounded">
                      {clipNamePrefix}
                      {index + 1}.mp4
                    </div>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => downloadClip(url, index)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

