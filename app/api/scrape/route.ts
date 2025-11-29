import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  console.log('[SCRAPE ROUTE] Request received')
  try {
    const body = await request.json()
    const { username, year } = body
    console.log('[SCRAPE ROUTE] Request body:', { username, year })

    if (!username || !username.trim()) {
      console.log('[SCRAPE ROUTE] Validation failed: username missing')
      return NextResponse.json(
        { success: false, error: 'Username is required' },
        { status: 400 }
      )
    }

    if (!year) {
      console.log('[SCRAPE ROUTE] Validation failed: year missing')
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
    const requestPayload = {
      username: username.trim(),
      year: year === 'ALL' || year.toString().toUpperCase() === 'ALL' ? 'ALL' : parseInt(year),
    }

    console.log('[SCRAPE ROUTE] Calling Python function:', pythonFunctionUrl)
    console.log('[SCRAPE ROUTE] Request payload:', requestPayload)
    console.log('[SCRAPE ROUTE] Environment:', {
      VERCEL_URL: process.env.VERCEL_URL,
      VERCEL: process.env.VERCEL,
      PORT: process.env.PORT
    })

    try {
      const fetchStartTime = Date.now()
      const response = await fetch(pythonFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      })

      const fetchDuration = Date.now() - fetchStartTime
      console.log('[SCRAPE ROUTE] Python function response received:', {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        duration: `${fetchDuration}ms`
      })

      // Get response text first to log it
      const responseText = await response.text()
      console.log('[SCRAPE ROUTE] Response text preview:', responseText.substring(0, 500))

      let data
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        try {
          data = JSON.parse(responseText)
          console.log('[SCRAPE ROUTE] Parsed JSON response, success:', data.success)
        } catch (parseError) {
          console.error('[SCRAPE ROUTE] Failed to parse JSON:', parseError)
          data = { success: false, error: 'Failed to parse JSON response' }
        }
      } else {
        console.log('[SCRAPE ROUTE] Non-JSON content type, attempting to parse anyway')
        try {
          data = JSON.parse(responseText)
        } catch {
          console.error('[SCRAPE ROUTE] Failed to parse response as JSON')
          data = { 
            success: false, 
            error: 'Invalid response format from Python function',
            contentType: contentType,
            responsePreview: responseText.substring(0, 200)
          }
        }
      }

      if (!response.ok) {
        console.error('[SCRAPE ROUTE] Python function returned error status:', response.status)
        console.error('[SCRAPE ROUTE] Error data:', data)
        return NextResponse.json(
          { success: false, error: data.error || 'Python function failed', details: data },
          { status: response.status }
        )
      }

      console.log('[SCRAPE ROUTE] Successfully returning data to client')
      return NextResponse.json(data)
    } catch (fetchError) {
      console.error('[SCRAPE ROUTE] Error calling Python function:', fetchError)
      console.error('[SCRAPE ROUTE] Error details:', {
        message: fetchError instanceof Error ? fetchError.message : 'Unknown error',
        stack: fetchError instanceof Error ? fetchError.stack : undefined,
        attemptedUrl: pythonFunctionUrl
      })
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
