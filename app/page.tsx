"use client"

import type React from "react"
import { useState } from "react"
import { Upload, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface FontResult {
  family: string
  variant: string
  confidence: number
  category: string
}

const FONT_DATABASE = [
  // Ultra-bold condensed fonts (Impact-like)
  { family: "Anton", category: "sans-serif", weight: "black", width: "condensed", popularity: 95 },
  { family: "Bebas Neue", category: "display", weight: "black", width: "condensed", popularity: 90 },
  { family: "Oswald", category: "sans-serif", weight: "bold", width: "condensed", popularity: 92 },
  { family: "Archivo Black", category: "sans-serif", weight: "black", width: "normal", popularity: 75 },
  { family: "Alfa Slab One", category: "display", weight: "black", width: "normal", popularity: 70 },

  // Bold serif fonts
  { family: "Playfair Display", category: "serif", weight: "bold", width: "normal", popularity: 95 },
  { family: "Merriweather", category: "serif", weight: "bold", width: "normal", popularity: 90 },
  { family: "Libre Baskerville", category: "serif", weight: "bold", width: "normal", popularity: 85 },
  { family: "Lora", category: "serif", weight: "medium", width: "normal", popularity: 88 },
  { family: "Crimson Text", category: "serif", weight: "medium", width: "normal", popularity: 80 },
  { family: "EB Garamond", category: "serif", weight: "medium", width: "normal", popularity: 87 },
  { family: "Cormorant Garamond", category: "serif", weight: "medium", width: "normal", popularity: 75 },

  // Regular serif fonts
  { family: "PT Serif", category: "serif", weight: "regular", width: "normal", popularity: 85 },
  { family: "Noto Serif", category: "serif", weight: "regular", width: "normal", popularity: 88 },
  { family: "Source Serif Pro", category: "serif", weight: "regular", width: "normal", popularity: 82 },

  // Bold sans-serif fonts
  { family: "Montserrat", category: "sans-serif", weight: "bold", width: "normal", popularity: 98 },
  { family: "Raleway", category: "sans-serif", weight: "bold", width: "normal", popularity: 95 },
  { family: "Poppins", category: "sans-serif", weight: "bold", width: "normal", popularity: 97 },
  { family: "Roboto", category: "sans-serif", weight: "medium", width: "normal", popularity: 99 },
  { family: "Open Sans", category: "sans-serif", weight: "medium", width: "normal", popularity: 98 },
  { family: "Lato", category: "sans-serif", weight: "medium", width: "normal", popularity: 96 },
  { family: "Inter", category: "sans-serif", weight: "medium", width: "normal", popularity: 94 },
  { family: "Nunito", category: "sans-serif", weight: "medium", width: "normal", popularity: 90 },

  // Condensed sans-serif
  { family: "Roboto Condensed", category: "sans-serif", weight: "medium", width: "condensed", popularity: 85 },
  { family: "PT Sans Narrow", category: "sans-serif", weight: "medium", width: "condensed", popularity: 75 },

  // Display fonts
  { family: "Righteous", category: "display", weight: "bold", width: "normal", popularity: 70 },
  { family: "Pacifico", category: "handwriting", weight: "regular", width: "normal", popularity: 85 },
  { family: "Lobster", category: "display", weight: "bold", width: "normal", popularity: 80 },
]

export default function FontIdentifier() {
  const [image, setImage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [fonts, setFonts] = useState<FontResult[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const imageData = e.target?.result as string
      setImage(imageData)
      identifyFont(imageData)
    }
    reader.readAsDataURL(file)
  }

  const identifyFont = async (imageData: string) => {
    setLoading(true)
    setError(null)

    try {
      console.log("[v0] Sending image to AI vision model...")

      const response = await fetch("/api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageData }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const results = await response.json()
      console.log("[v0] AI results:", results)

      setFonts(results.fonts)
    } catch (error) {
      console.error("[v0] Font identification error:", error)
      setError(error instanceof Error ? error.message : "Unknown error occurred")
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setImage(null)
    setFonts([])
    setError(null)
  }

  return (
    <main className="min-h-screen bg-background">
      {!image ? (
        <div className="flex min-h-screen flex-col items-center justify-center p-6">
          <div className="w-full max-w-2xl space-y-8 text-center">
            <div className="space-y-3">
              <h1 className="text-5xl font-bold tracking-tight text-balance">What the Font</h1>
              <p className="text-lg text-muted-foreground text-pretty">Upload an image to identify fonts using AI</p>
            </div>

            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`relative rounded-xl border-2 border-dashed p-12 transition-colors ${
                dragActive ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/50"
              }`}
            >
              <input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-full bg-primary/10 p-4">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-medium">Drop your image here</p>
                  <p className="text-sm text-muted-foreground">or click to browse</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-7xl p-6 space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                {loading ? "Analyzing with AI..." : error ? "Error" : `${fonts.length} fonts found`}
              </h2>
              <p className="text-sm text-muted-foreground">{error ? error : "Powered by Fontjoy vector embeddings"}</p>
            </div>
            <Button onClick={reset} variant="outline" size="sm">
              <X className="mr-2 h-4 w-4" />
              New Search
            </Button>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <img
              src={image || "/placeholder.svg"}
              alt="Uploaded font sample"
              className="mx-auto max-h-32 object-contain"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="rounded-xl border border-destructive bg-destructive/10 p-6 text-center">
              <p className="text-destructive">{error}</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {fonts.map((font, idx) => (
                <FontCard key={`${font.family}-${idx}`} font={font} />
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  )
}

function FontCard({ font }: { font: FontResult }) {
  const [loaded, setLoaded] = useState(false)

  const loadFont = () => {
    if (loaded) return

    const link = document.createElement("link")
    link.href = `https://fonts.googleapis.com/css2?family=${font.family.replace(/ /g, "+")}:wght@400;700&display=swap`
    link.rel = "stylesheet"
    document.head.appendChild(link)
    setLoaded(true)
  }

  return (
    <div
      className="group rounded-xl border bg-card p-6 transition-all hover:border-primary hover:shadow-lg"
      onMouseEnter={loadFont}
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <h3 className="font-semibold">{font.family}</h3>
          <p className="text-xs text-muted-foreground capitalize">
            {font.variant} • {(font.confidence * 100).toFixed(1)}% confidence
          </p>
        </div>

        <div className="space-y-2 rounded-lg bg-muted/50 p-4" style={{ fontFamily: `'${font.family}', sans-serif` }}>
          <p className="text-2xl font-normal">Aa Bb Cc</p>
          <p className="text-sm">The quick brown fox</p>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full bg-transparent"
          onClick={() => window.open(`https://fonts.google.com/specimen/${font.family.replace(/ /g, "+")}`, "_blank")}
        >
          View on Google Fonts
        </Button>
      </div>
    </div>
  )
}
