import * as React from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

const ScrollableTabs = React.forwardRef<
  React.ElementRef<typeof Tabs>,
  React.ComponentPropsWithoutRef<typeof Tabs> & {
    children: React.ReactNode
  }
>(({ className, children, ...props }, ref) => {
  const isMobile = useIsMobile()
  
  return (
    <Tabs
      ref={ref}
      className={cn(className)}
      {...props}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && child.type === TabsList) {
          return React.cloneElement(child as React.ReactElement<any>, {
            className: cn(
              (child.props as any).className,
              isMobile && [
                "!flex !w-full !justify-start overflow-x-auto gap-1 p-1 !inline-flex-none touch-pan-x flex-nowrap",
                "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border"
              ]
            ),
            style: isMobile ? {
              scrollbarWidth: 'thin',
              scrollbarColor: 'hsl(var(--border)) transparent',
              ...(child.props as any).style
            } : (child.props as any).style
          })
        }
        
        if (React.isValidElement(child) && child.type === TabsTrigger) {
          return React.cloneElement(child as React.ReactElement<any>, {
            className: cn(
              (child.props as any).className,
              isMobile && "flex-shrink-0 min-w-fit text-sm px-2 py-1.5"
            )
          })
        }
        
        return child
      })}
    </Tabs>
  )
})

ScrollableTabs.displayName = "ScrollableTabs"

// Helper component to wrap TabsList for better ergonomics
const ScrollableTabsList = React.forwardRef<
  React.ElementRef<typeof TabsList>,
  React.ComponentPropsWithoutRef<typeof TabsList>
>(({ className, ...props }, ref) => {
  const isMobile = useIsMobile()
  
  return (
    <TabsList
      ref={ref}
      className={cn(
        className,
        isMobile && [
          "!flex !w-full !justify-start overflow-x-auto gap-1 p-1 !inline-flex-none touch-pan-x flex-nowrap",
          "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border"
        ]
      )}
      style={isMobile ? {
        scrollbarWidth: 'thin',
        scrollbarColor: 'hsl(var(--border)) transparent'
      } : undefined}
      {...props}
    />
  )
})

ScrollableTabsList.displayName = "ScrollableTabsList"

const ScrollableTabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsTrigger>,
  React.ComponentPropsWithoutRef<typeof TabsTrigger>
>(({ className, ...props }, ref) => {
  const isMobile = useIsMobile()
  
  return (
    <TabsTrigger
      ref={ref}
      className={cn(
        className,
        isMobile && "flex-shrink-0 min-w-fit text-sm px-2 py-1.5"
      )}
      {...props}
    />
  )
})

ScrollableTabsTrigger.displayName = "ScrollableTabsTrigger"

export { ScrollableTabs, ScrollableTabsList, ScrollableTabsTrigger, TabsContent }