import { UTApi } from "uploadthing/server"
import { NextResponse } from "next/server"

const utapi = new UTApi()

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as unknown
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    // UTApi expects File, so ensure correct type
    const blob = file as File
    const response = await utapi.uploadFiles(blob)
    // Normalize response.data to an array in case it's null or a single object
    const data = response.data
    const files = data == null ? [] : Array.isArray(data) ? data : [data]
    // Map to ufsUrl (ensure correct typing)
    const urls = files.map((f: any) => f.ufsUrl)
    return NextResponse.json({ urls })
  } catch (error) {
    console.error('Server upload failed:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}