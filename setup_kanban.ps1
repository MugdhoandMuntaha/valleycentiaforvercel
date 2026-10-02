$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
$repo = "MugdhoandMuntaha/valleycentiaforvercel"
$projectNumber = 2
$owner = "MugdhoandMuntaha"

# Close issue #1 as completed
gh issue close 1 --repo $repo --comment "Completed as part of initial release."

$items = @(
    @{
        Title = "MongoDB Atlas Database Integration & Mongoose Schema Definitions"
        Body = "Setup MongoDB connection with replica set clustering, define schemas for Products, Categories, Collections, Orders, SiteSettings, and HeroSlides."
        Labels = "backend"
        Status = "Done"
        Priority = "P0 - Urgent"
        Track = "Storefront"
        Close = $true
    },
    @{
        Title = "Clerk Authentication & Role-Based Middleware Protection"
        Body = "Implement user sign-up, sign-in, profile management, and route protection using @clerk/nextjs for store customers."
        Labels = "auth"
        Status = "Done"
        Priority = "P1 - High"
        Track = "Storefront"
        Close = $true
    },
    @{
        Title = "Product Catalog, Dynamic Filter, Search, and Product Detail Pages"
        Body = "Build PDP pages with image galleries, price discount calculations, size selection, dynamic breadcrumbs, related products, and customer reviews."
        Labels = "frontend"
        Status = "Done"
        Priority = "P1 - High"
        Track = "Storefront"
        Close = $true
    },
    @{
        Title = "Cart Drawer & Multi-Step Checkout Flow with Cash on Delivery (COD)"
        Body = "Implement client-side cart persistence, coupon discount calculations, shipping fee thresholds, and complete order placement flow with COD confirmation."
        Labels = "frontend,payment"
        Status = "Done"
        Priority = "P1 - High"
        Track = "Storefront"
        Close = $true
    },
    @{
        Title = "Admin Panel Dashboard for Products, Collections, and Site Settings"
        Body = "Dedicated admin portal (admin-panel) with NextAuth credentials authentication, product CRUD, hero slide manager, coupon management, and global site settings."
        Labels = "admin-panel,backend"
        Status = "Done"
        Priority = "P1 - High"
        Track = "Admin Panel"
        Close = $true
    },
    @{
        Title = "Order Management System (OMS Panel) with Order Lifecycle Tracking"
        Body = "Dedicated OMS workspace (oms-panel) for order fulfillment, status transitions (Pending, Processing, Shipped, Delivered, Cancelled), customer details, and invoice review."
        Labels = "oms-panel,backend"
        Status = "Done"
        Priority = "P1 - High"
        Track = "OMS Panel"
        Close = $true
    },
    @{
        Title = "Vercel Deployment Configuration & Production Environment Tuning"
        Body = "Optimize Next.js Turbopack build configurations, environment variable secrets for Vercel, and edge route caching."
        Labels = "devops"
        Status = "In Progress"
        Priority = "P0 - Urgent"
        Track = "DevOps & Cloud"
        Close = $false
    },
    @{
        Title = "SSLCommerz Payment Gateway Production Verification & IPN Webhook Handling"
        Body = "Finalize SSLCommerz live credentials, payment session initialization, validate IPN callback webhooks, and handle transaction status updates in MongoDB."
        Labels = "payment,backend"
        Status = "In Progress"
        Priority = "P1 - High"
        Track = "Storefront"
        Close = $false
    },
    @{
        Title = "Dynamic Image Storage & Cloud CDN Optimization for Uploads"
        Body = "Configure persistent cloud object storage (e.g. AWS S3 / Cloudinary / Supabase Storage) for product photos and admin uploads instead of local ephemeral storage."
        Labels = "backend,devops"
        Status = "In Progress"
        Priority = "P1 - High"
        Track = "DevOps & Cloud"
        Close = $false
    },
    @{
        Title = "Real-Time Order Notifications via SMS & Email (Courier & Customer)"
        Body = "Send automated SMS notifications upon order confirmation, dispatch, and delivery via local SMS gateway and transactional email."
        Labels = "oms-panel,backend"
        Status = "Todo"
        Priority = "P2 - Medium"
        Track = "OMS Panel"
        Close = $false
    },
    @{
        Title = "Customer Review & Rating Submission Flow with Admin Moderation"
        Body = "Allow verified purchasers to post product reviews and photos with an approval queue in the admin panel."
        Labels = "frontend,admin-panel"
        Status = "Todo"
        Priority = "P2 - Medium"
        Track = "Storefront"
        Close = $false
    },
    @{
        Title = "Automated PDF Invoice Generation & Packing Slip Export in OMS"
        Body = "Generate downloadable, printable PDF receipts, invoices, and shipping labels using jsPDF / html2canvas in OMS panel."
        Labels = "oms-panel,frontend"
        Status = "Todo"
        Priority = "P2 - Medium"
        Track = "OMS Panel"
        Close = $false
    },
    @{
        Title = "AI Semantic Search & Intelligent Product Recommendation Engine"
        Body = "Integrate SiliconFlow / Gemini AI embedding-based search for natural language queries like 'hair care for frizz' or 'summer moisturizer'."
        Labels = "backend"
        Status = "Todo"
        Priority = "P2 - Medium"
        Track = "Storefront"
        Close = $false
    },
    @{
        Title = "Inventory Low-Stock Alerts & Automated Stock Depletion Thresholds"
        Body = "Notify store managers in admin and OMS when product stock drops below critical levels to prevent overselling."
        Labels = "admin-panel,oms-panel"
        Status = "Todo"
        Priority = "P2 - Medium"
        Track = "Admin Panel"
        Close = $false
    },
    @{
        Title = "Multi-Currency & International Shipping Rates Support"
        Body = "Support dynamic currency conversions, regional tax calculations, and localized courier shipping options."
        Labels = "payment"
        Status = "Todo"
        Priority = "P3 - Low"
        Track = "Storefront"
        Close = $false
    },
    @{
        Title = "Automated CI/CD Pipeline & End-to-End Testing Suite"
        Body = "Implement GitHub Actions workflows for continuous integration, linting, build checks, and Playwright end-to-end regression tests."
        Labels = "devops"
        Status = "Todo"
        Priority = "P2 - Medium"
        Track = "DevOps & Cloud"
        Close = $false
    }
)

foreach ($item in $items) {
    Write-Host "Creating Issue: $($item.Title)..."
    $issueUrl = gh issue create --repo $repo --title $item.Title --body $item.Body --label $item.Labels
    Write-Host "Issue created: $issueUrl"
    
    gh project item-add $projectNumber --owner $owner --url $issueUrl
    gh project item-edit $projectNumber --owner $owner --url $issueUrl --field "Status" --value $item.Status
    gh project item-edit $projectNumber --owner $owner --url $issueUrl --field "Priority" --value $item.Priority
    gh project item-edit $projectNumber --owner $owner --url $issueUrl --field "Track" --value $item.Track

    if ($item.Close) {
        $issueNum = $issueUrl.Split('/')[-1]
        gh issue close $issueNum --repo $repo --comment "Completed and verified."
    }
}

Write-Host "All Kanban backlog and progress items successfully created and synced!"
