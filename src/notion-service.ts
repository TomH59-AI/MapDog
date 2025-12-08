/**
 * Notion Integration Service for SCIP
 * Syncs Site Candidate Information Packages to Notion databases
 */

import { Client } from '@notionhq/client'

export interface NotionSCIPConfig {
  notionApiKey: string
  databaseId: string
}

/**
 * Create or update a SCIP page in Notion
 */
export async function syncSCIPToNotion(
  config: NotionSCIPConfig,
  scipData: any,
  existingPageId?: string
): Promise<string> {
  const notion = new Client({ auth: config.notionApiKey })

  // Prepare properties for Notion database
  const properties: any = {
    // Title
    'Site Name': {
      title: [
        {
          text: {
            content: scipData.siteName || 'Untitled Site'
          }
        }
      ]
    },

    // Site Identification
    'Address': {
      rich_text: [
        {
          text: {
            content: scipData.siteAddress || ''
          }
        }
      ]
    },
    'County': {
      select: {
        name: scipData.siteCounty || 'Unknown'
      }
    },
    'Latitude': {
      number: scipData.latitude || null
    },
    'Longitude': {
      number: scipData.longitude || null
    },

    // Property Information
    'Owner Name': {
      rich_text: [
        {
          text: {
            content: scipData.ownerName || ''
          }
        }
      ]
    },
    'Parcel Number': {
      rich_text: [
        {
          text: {
            content: scipData.parcelNumber || ''
          }
        }
      ]
    },
    'Parcel Acres': {
      number: scipData.parcelAcres || null
    },

    // Zoning & Land Use
    'Zoning': {
      rich_text: [
        {
          text: {
            content: scipData.zoningDesignation || ''
          }
        }
      ]
    },
    'Land Use': {
      rich_text: [
        {
          text: {
            content: scipData.landUse || ''
          }
        }
      ]
    },

    // Environmental
    'Flood Zone': {
      rich_text: [
        {
          text: {
            content: scipData.floodZone || ''
          }
        }
      ]
    },
    'Wetlands Present': {
      checkbox: scipData.wetlandsPresent || false
    },

    // Financial
    'Assessed Value': {
      number: scipData.assessedValue || null
    },
    'Market Value': {
      number: scipData.marketValue || null
    },
    'Estimated Lease Rate': {
      rich_text: [
        {
          text: {
            content: scipData.estimatedLeaseRate || ''
          }
        }
      ]
    },

    // Scoring
    'Overall Score': {
      number: scipData.overallScore || 0
    },
    'Distance from Center (mi)': {
      number: scipData.distanceFromCenter || null
    },

    // Status
    'Status': {
      select: {
        name: 'Candidate'
      }
    }
  }

  try {
    if (existingPageId) {
      // Update existing page
      const response = await notion.pages.update({
        page_id: existingPageId,
        properties
      })
      return response.id
    } else {
      // Create new page
      const response = await notion.pages.create({
        parent: {
          database_id: config.databaseId
        },
        properties
      })
      return response.id
    }
  } catch (error) {
    console.error('Notion sync error:', error)
    throw new Error(`Failed to sync to Notion: ${error.message}`)
  }
}

/**
 * Create a comprehensive SCIP page with all sections
 */
export async function createFullSCIPPage(
  config: NotionSCIPConfig,
  scipData: any
): Promise<string> {
  const notion = new Client({ auth: config.notionApiKey })

  // First create the page with properties
  const pageId = await syncSCIPToNotion(config, scipData)

  // Then add detailed content blocks
  const blocks: any[] = []

  // Header
  blocks.push({
    object: 'block',
    type: 'heading_1',
    heading_1: {
      rich_text: [
        {
          type: 'text',
          text: {
            content: `SCIP: ${scipData.siteName || 'Untitled Site'}`
          }
        }
      ]
    }
  })

  // Site Identification Section
  blocks.push({
    object: 'block',
    type: 'heading_2',
    heading_2: {
      rich_text: [
        {
          type: 'text',
          text: {
            content: '📍 Site Identification'
          }
        }
      ]
    }
  })

  blocks.push({
    object: 'block',
    type: 'table',
    table: {
      table_width: 2,
      has_column_header: false,
      has_row_header: false,
      children: [
        {
          type: 'table_row',
          table_row: {
            cells: [
              [{ type: 'text', text: { content: 'Site Address' } }],
              [{ type: 'text', text: { content: scipData.siteAddress || 'N/A' } }]
            ]
          }
        },
        {
          type: 'table_row',
          table_row: {
            cells: [
              [{ type: 'text', text: { content: 'Coordinates' } }],
              [{ type: 'text', text: { content: scipData.latitude && scipData.longitude ? `${scipData.latitude}, ${scipData.longitude}` : 'N/A' } }]
            ]
          }
        },
        {
          type: 'table_row',
          table_row: {
            cells: [
              [{ type: 'text', text: { content: 'County' } }],
              [{ type: 'text', text: { content: scipData.siteCounty || 'N/A' } }]
            ]
          }
        }
      ]
    }
  })

  // Property Information Section
  blocks.push({
    object: 'block',
    type: 'heading_2',
    heading_2: {
      rich_text: [
        {
          type: 'text',
          text: {
            content: '🏠 Property Information'
          }
        }
      ]
    }
  })

  blocks.push({
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: {
      rich_text: [
        {
          type: 'text',
          text: {
            content: `Owner: ${scipData.ownerName || 'Unknown'}`
          }
        }
      ]
    }
  })

  blocks.push({
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: {
      rich_text: [
        {
          type: 'text',
          text: {
            content: `Parcel Number: ${scipData.parcelNumber || 'Unknown'}`
          }
        }
      ]
    }
  })

  blocks.push({
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: {
      rich_text: [
        {
          type: 'text',
          text: {
            content: `Size: ${scipData.parcelAcres || 'Unknown'} acres`
          }
        }
      ]
    }
  })

  // Zoning Section
  blocks.push({
    object: 'block',
    type: 'heading_2',
    heading_2: {
      rich_text: [
        {
          type: 'text',
          text: {
            content: '🏛️ Zoning & Land Use'
          }
        }
      ]
    }
  })

  blocks.push({
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: {
      rich_text: [
        {
          type: 'text',
          text: {
            content: `Zoning: ${scipData.zoningDesignation || 'Unknown'}`
          }
        }
      ]
    }
  })

  blocks.push({
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: {
      rich_text: [
        {
          type: 'text',
          text: {
            content: `Current Use: ${scipData.currentUse || 'Unknown'}`
          }
        }
      ]
    }
  })

  // Environmental Section
  blocks.push({
    object: 'block',
    type: 'heading_2',
    heading_2: {
      rich_text: [
        {
          type: 'text',
          text: {
            content: '🌿 Environmental Concerns'
          }
        }
      ]
    }
  })

  blocks.push({
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: {
      rich_text: [
        {
          type: 'text',
          text: {
            content: `Flood Zone: ${scipData.floodZone || 'Unknown'}`
          }
        }
      ]
    }
  })

  blocks.push({
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: {
      rich_text: [
        {
          type: 'text',
          text: {
            content: `Wetlands: ${scipData.wetlandsPresent ? 'Yes' : 'No'}`
          }
        }
      ]
    }
  })

  if (scipData.environmentalConcerns) {
    blocks.push({
      object: 'block',
      type: 'callout',
      callout: {
        rich_text: [
          {
            type: 'text',
            text: {
              content: scipData.environmentalConcerns
            }
          }
        ],
        icon: {
          emoji: '⚠️'
        }
      }
    })
  }

  // Financial Section
  blocks.push({
    object: 'block',
    type: 'heading_2',
    heading_2: {
      rich_text: [
        {
          type: 'text',
          text: {
            content: '💰 Financial Information'
          }
        }
      ]
    }
  })

  blocks.push({
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: {
      rich_text: [
        {
          type: 'text',
          text: {
            content: `Market Value: $${(scipData.marketValue || 0).toLocaleString()}`
          }
        }
      ]
    }
  })

  blocks.push({
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: {
      rich_text: [
        {
          type: 'text',
          text: {
            content: `Estimated Lease Rate: ${scipData.estimatedLeaseRate || 'TBD'}`
          }
        }
      ]
    }
  })

  // Scoring Section
  blocks.push({
    object: 'block',
    type: 'heading_2',
    heading_2: {
      rich_text: [
        {
          type: 'text',
          text: {
            content: '⭐ Site Score'
          }
        }
      ]
    }
  })

  blocks.push({
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: [
        {
          type: 'text',
          text: {
            content: `Overall Score: ${scipData.overallScore || 0}/100`
          }
        }
      ]
    }
  })

  if (scipData.scoreBreakdown) {
    for (const [category, score] of Object.entries(scipData.scoreBreakdown)) {
      blocks.push({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: `${category}: ${score} points`
              }
            }
          ]
        }
      })
    }
  }

  // Add images if available
  if (scipData.aerialImageUrl) {
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [
          {
            type: 'text',
            text: {
              content: '📸 Site Images'
            }
          }
        ]
      }
    })

    blocks.push({
      object: 'block',
      type: 'image',
      image: {
        type: 'external',
        external: {
          url: scipData.aerialImageUrl
        }
      }
    })
  }

  // Append all blocks to the page
  try {
    await notion.blocks.children.append({
      block_id: pageId,
      children: blocks
    })
  } catch (error) {
    console.error('Error adding blocks to Notion page:', error)
    // Page was created, so still return the ID
  }

  return pageId
}

/**
 * Verify Notion database exists and has correct schema
 */
export async function verifyNotionDatabase(
  config: NotionSCIPConfig
): Promise<boolean> {
  const notion = new Client({ auth: config.notionApiKey })

  try {
    const database = await notion.databases.retrieve({
      database_id: config.databaseId
    })
    return true
  } catch (error) {
    console.error('Notion database verification error:', error)
    return false
  }
}
