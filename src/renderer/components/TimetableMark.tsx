import type { SVGProps } from 'react'

type TimetableMarkProps = SVGProps<SVGSVGElement> & {
  title?: string
}

export function TimetableMark({ title = 'Timetable.OS', ...props }: TimetableMarkProps) {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label={title} fill="none" {...props}>
      <path
        d="M31.9 8.8c6.8 0 12.4 5.4 12.4 12.1 0 2.1-.5 4-1.4 5.7 5.2 1.5 8.9 6.2 8.9 11.9 0 6.9-5.6 12.5-12.5 12.5-2.1 0-4.1-.5-5.8-1.5-2 4-6.2 6.7-11 6.7-6.8 0-12.4-5.5-12.4-12.3 0-2.2.6-4.2 1.6-6-4.2-2.1-7-6.3-7-11.2 0-6.9 5.6-12.5 12.5-12.5 2.1 0 4.1.5 5.8 1.5 2-4.1 5.4-6.9 8.9-6.9Z"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M23 15.7c5.7 2.8 13.6 7.3 19.9 10.9m-31.2 11.3c5.9-2.6 23.1-10.9 31.2-11.3M23 48.9c1.4-6.1 6.9-31.9 8.9-40.1m1.6 40.7c-4.3-4.7-15.8-18.4-21.8-31.3m39.9 20.3c-6.2.6-24.4 1.9-39.9-.6"
        stroke="currentColor"
        strokeWidth="4.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.88"
      />
    </svg>
  )
}
