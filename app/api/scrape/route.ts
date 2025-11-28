import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, year } = body

    if (!username || !username.trim()) {
      return NextResponse.json(
        { success: false, error: 'Username is required' },
        { status: 400 }
      )
    }

    if (!year) {
      return NextResponse.json(
        { success: false, error: 'Year is required' },
        { status: 400 }
      )
    }

    // Call the Python serverless function
    // Works in both production and local development (with vercel dev)
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : process.env.VERCEL 
        ? `http://localhost:${process.env.PORT || 3000}`
        : 'http://localhost:3000'
    
    const pythonFunctionUrl = `${baseUrl}/api/scrape_job`

    try {
      const response = await fetch(pythonFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          year: year === 'ALL' || year.toString().toUpperCase() === 'ALL' ? 'ALL' : parseInt(year),
        }),
      })

      let data
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        data = await response.json()
      } else {
        const text = await response.text()
        try {
          data = JSON.parse(text)
        } catch {
          data = { success: false, error: 'Invalid response format from Python function' }
        }
      }

      if (!response.ok) {
        return NextResponse.json(
          { success: false, error: data.error || 'Python function failed', details: data },
          { status: response.status }
        )
      }

      return NextResponse.json(data)
    } catch (fetchError) {
      console.error('Error calling Python function:', fetchError)
      return NextResponse.json(
        {
          success: false,
          error: 'Unable to reach Python serverless function',
          details: fetchError instanceof Error ? fetchError.message : 'Unknown error'
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in API route:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
