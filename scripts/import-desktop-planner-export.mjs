import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { env } from 'node:process'

const projectRoot = process.cwd()
const exportPath = join(projectRoot, 'desktop-planner-personal-data-export-20260424-165547.md')
const targetPath = join(env.APPDATA ?? join(env.USERPROFILE ?? projectRoot, 'AppData', 'Roaming'), 'Timetable', 'app-data.json')

const dayMap = new Map([
  ['Monday', 1],
  ['Tuesday', 2],
  ['Wednesday', 3],
  ['Thursday', 4],
  ['Friday', 5],
  ['Saturday', 6],
  ['Sunday', 7],
  ['周一', 1],
  ['周二', 2],
  ['周三', 3],
  ['周四', 4],
  ['周五', 5],
  ['周六', 6],
  ['周日', 7],
  ['周天', 7],
])

const colorFallbacks = ['#3B82F6', '#14B8A6', '#8B5CF6', '#F97316', '#EAB308', '#06B6D4', '#EC4899']

function getJsonBlocks(markdown) {
  const blocks = new Map()
  const blockPattern = /^### (.+?)\r?\n\r?\n```json\r?\n([\s\S]*?)\r?\n```/gm
  for (const match of markdown.matchAll(blockPattern)) {
    blocks.set(match[1].trim(), JSON.parse(match[2]))
  }
  return blocks
}

function stripSeconds(time) {
  return String(time ?? '00:00').slice(0, 5)
}

function mapRepeatType(value) {
  const normalized = String(value ?? '').toLowerCase()
  if (normalized.includes('odd') || normalized.includes('single') || normalized.includes('单')) {
    return 'odd'
  }
  if (normalized.includes('even') || normalized.includes('double') || normalized.includes('双')) {
    return 'even'
  }
  return 'weekly'
}

function mapTaskRepeat(value) {
  const normalized = String(value ?? '').toLowerCase()
  if (normalized.includes('daily') || normalized.includes('每天')) {
    return 'daily'
  }
  if (normalized.includes('weekly') || normalized.includes('每周')) {
    return 'weekly'
  }
  if (normalized.includes('work') || normalized.includes('weekday') || normalized.includes('工作')) {
    return 'workday'
  }
  if (normalized.includes('holiday') || normalized.includes('weekend') || normalized.includes('假期') || normalized.includes('周末')) {
    return 'holiday'
  }
  return 'once'
}

function mapWeeklyDays(task) {
  const days = []
  if (task.repeatOnMonday) days.push(1)
  if (task.repeatOnTuesday) days.push(2)
  if (task.repeatOnWednesday) days.push(3)
  if (task.repeatOnThursday) days.push(4)
  if (task.repeatOnFriday) days.push(5)
  if (task.repeatOnSaturday) days.push(6)
  if (task.repeatOnSunday) days.push(7)
  return days
}

function completionMap(dates = []) {
  return Object.fromEntries(dates.map((date) => [date, true]))
}

function mapGoalStatus(value) {
  const normalized = String(value ?? '').toLowerCase()
  if (normalized.includes('complete') || normalized.includes('已完成')) {
    return 'completed'
  }
  if (normalized.includes('pause') || normalized.includes('暂停')) {
    return 'paused'
  }
  return 'active'
}

function parsePositionPair(left, top, fallbackX, fallbackY) {
  return {
    x: Number.isFinite(Number(left)) ? Math.round(Number(left)) : fallbackX,
    y: Number.isFinite(Number(top)) ? Math.round(Number(top)) : fallbackY,
  }
}

function widget(x, y, width, height, extra = {}) {
  return {
    enabled: true,
    opacity: 0.86,
    x,
    y,
    width,
    height,
    autoHide: false,
    minimized: false,
    ...extra,
  }
}

function makeImportedData(blocks) {
  const config = blocks.get('config.json') ?? {}
  const coursesSource = blocks.get('courses.json') ?? []
  const tasksSource = blocks.get('daily-tasks.json') ?? []
  const memosSource = blocks.get('memos.json') ?? []
  const goalsSource = blocks.get('long-tasks.json') ?? []
  const now = new Date().toISOString()
  const courseColorByTitle = new Map()

  const courses = coursesSource.map((course) => {
    if (!courseColorByTitle.has(course.title)) {
      courseColorByTitle.set(course.title, course.accentColor || colorFallbacks[courseColorByTitle.size % colorFallbacks.length])
    }
    return {
      id: `course-${course.id}`,
      name: course.title || 'Untitled course',
      teacher: course.teacherName || '',
      location: course.location || '',
      dayOfWeek: dayMap.get(course.dayOfWeek) ?? 1,
      startTime: stripSeconds(course.startTimeText || course.startTime),
      endTime: stripSeconds(course.endTimeText || course.endTime),
      repeatType: mapRepeatType(course.weekPattern),
      color: courseColorByTitle.get(course.title),
    }
  })

  const dailyTasks = tasksSource.map((task) => {
    const repeatRule = mapTaskRepeat(task.recurrenceType || task.recurrenceSummary)
    const noteParts = []
    if (task.notes) noteParts.push(task.notes)
    if (Number.isFinite(Number(task.estimatedMinutes)) && Number(task.estimatedMinutes) > 0) {
      noteParts.push(`Estimated minutes: ${task.estimatedMinutes}`)
    }
    return {
      id: `task-${task.id}`,
      title: task.title || 'Untitled task',
      repeatRule,
      weeklyDays: repeatRule === 'weekly' ? mapWeeklyDays(task) : undefined,
      startDate: task.date || undefined,
      endDate: task.hasEndDate && task.endDate ? task.endDate : undefined,
      priority: Number(task.estimatedMinutes) >= 90 ? 'high' : Number(task.estimatedMinutes) <= 20 ? 'low' : 'medium',
      completions: completionMap(task.completedDates),
      note: noteParts.join('\n') || undefined,
      createdAt: task.dateValue || (task.date ? `${task.date}T00:00:00.000Z` : now),
    }
  })

  const longTermGoals = goalsSource.map((goal) => {
    const status = mapGoalStatus(goal.status)
    const stageStatus = status === 'completed' ? 'completed' : status === 'active' ? 'active' : 'pending'
    return {
      id: `goal-${goal.id}`,
      title: goal.title || 'Untitled goal',
      status,
      progress: Math.round(Number(goal.progressPercentage) || 0),
      targetDate: goal.targetDate || undefined,
      currentStageId: `stage-${goal.id}`,
      stages: [
        {
          id: `stage-${goal.id}`,
          title: 'Imported progress',
          status: stageStatus,
        },
      ],
      subtasks: [],
      note: goal.description || undefined,
      createdAt: now,
    }
  })

  const memos = memosSource.map((memo, index) => ({
    id: `memo-${memo.id}`,
    title: memo.title || 'Untitled memo',
    content: memo.content || '',
    status: memo.isEnded ? 'ended' : 'active',
    showOnDesktop: !memo.isEnded && index === 0,
    createdAt: now,
    endedAt: memo.isEnded ? now : undefined,
  }))

  const mainPanelPosition = parsePositionPair(config.panelLeft, config.panelTop, 40, 42)
  const countdownPosition = parsePositionPair(config.countdownLeft, config.countdownTop, 64, 640)
  const principlePosition = parsePositionPair(config.corePrincipleLeft, config.corePrincipleTop, 520, 672)

  return {
    courses,
    dailyTasks,
    longTermGoals,
    memos,
    principleCard: {
      enabled: Boolean(config.corePrincipleText),
      content: config.corePrincipleText || '',
      author: '',
      position: 'bottom-center',
      opacity: 0.84,
      autoHide: Boolean(config.corePrincipleEdgeAutoHideEnabled),
    },
    countdownCard: {
      enabled: config.countdownVisible !== false,
      minimized: Boolean(config.countdownMinimized),
      position: 'bottom-left',
      opacity: 0.88,
    },
    desktopSettings: {
      overlayEnabled: true,
      opacity: Number(config.panelOpacity) || 0.88,
      scale: 1,
      alwaysOnTop: true,
      autoHide: Boolean(config.edgeAutoHideEnabled),
      dragLocked: false,
      overlayMode: 'floating',
      widgets: {
        mainPanel: widget(mainPanelPosition.x, mainPanelPosition.y, Math.round(Number(config.panelWidth) || 460), Math.round(Number(config.panelHeight) || 570)),
        dailyTasks: widget(560, 72, 430, 430),
        memo: widget(1030, 78, 420, 380),
        countdown: widget(countdownPosition.x, countdownPosition.y, 340, 240, {
          enabled: config.countdownVisible !== false,
          minimized: Boolean(config.countdownMinimized),
        }),
        principle: widget(principlePosition.x, principlePosition.y, 400, 220, {
          enabled: Boolean(config.corePrincipleText),
          autoHide: Boolean(config.corePrincipleEdgeAutoHideEnabled),
        }),
      },
    },
    appSettings: {
      autoSave: true,
      launchAtStartup: true,
      dataPath: targetPath,
      termStartDate: config.semesterStartDate || '2026-03-09',
      lastSavedAt: now,
    },
  }
}

const markdown = await readFile(exportPath, 'utf-8')
const blocks = getJsonBlocks(markdown)
const data = makeImportedData(blocks)

await mkdir(dirname(targetPath), { recursive: true })

try {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  await copyFile(targetPath, join(dirname(targetPath), `app-data.before-desktop-planner-import-${stamp}.json`))
} catch {
  // No existing data file to back up.
}

await writeFile(targetPath, `${JSON.stringify(data, null, 2)}\n`, 'utf-8')

console.log(JSON.stringify({
  targetPath,
  counts: {
    courses: data.courses.length,
    dailyTasks: data.dailyTasks.length,
    longTermGoals: data.longTermGoals.length,
    memos: data.memos.length,
  },
}, null, 2))
