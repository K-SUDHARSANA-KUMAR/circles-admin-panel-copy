import { ReactNode } from "react"

export interface Action {
    title: string
    icon?: ReactNode
    showWarning? : boolean
    handleAction?: (item: any) => void
    href?: (item: any) => string
}