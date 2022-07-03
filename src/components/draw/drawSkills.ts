import { Config } from "../config/config"
import { Card, Skill } from "../maker/card"
import { Coord } from '../entity/Coord'
import { Rect } from '../entity/Rect'
import { transColor } from "../util/transcolor"
import { Canvas, tempCanvas } from "./draw"
import { Miscellaneous } from "./miscellaneous"
import { applyText } from "./textstyle"
import * as df from "../fonts/dynamicFont"

// 绘制一行技能
function drawLine(cf: Config, cvs: Canvas, line: string, fontSize: number, isItalic: boolean, lastLine: boolean, drawRatio = 0, y: number, xoff: number) {
    let font = fontSize + "px FangZhengZhuYuan"
    font = isItalic ? 'italic ' + font : font
    
    // 创建临时Canvas, 确保宽度对齐
    const w1 = cvs.ctx.measureText(line).width  // 实际宽度
    const size = new Coord(w1, fontSize * 2)    // 加高，确保文字完整显示
    const tempCvs = tempCanvas(size, size, 1.5) // 超分辨绘制，确保字体锐利
    tempCvs.ctx.font = font
    applyText(tempCvs.ctx, cf.skText.textStyle)
    tempCvs.ctx.fillText(line, 0, size.y / 2)

    // 绘制粗体
    if (line.length >= 3 && line[2] === '技') {
        // 确定是否需要绘制粗体
        let boldText = line.slice(0, 4)
        if (line.length >= 7 && line[6] === '技') {
            boldText = boldText + line.slice(4, 7)
        }
        // 清空粗体区域
        const clearWidth = tempCvs.ctx.measureText(boldText).width
        tempCvs.ctx.clearRect(0, 0, clearWidth, size.y)
        // 绘制此题
        tempCvs.ctx.font = 'bold ' + font
        tempCvs.ctx.fillText(boldText, 0, size.y / 2)
    }

    // 确定宽度
    let w2 = cf.skText.w - xoff  // 绘制宽度
    w2 = lastLine ? w1 : w2
    w2 = lastLine && drawRatio ? w1 * drawRatio : w2
    const d = {
        x: cf.skText.x1 + xoff,
        y: y - size.y / 2,
        w: w2,
        h: size.y
    }

    // 绘制
    cvs.ctx.drawImage(tempCvs.canvas, d.x, d.y, d.w, d.h)

    return w2 / w1
}

// 绘制并获取技能高度
function skillHeight(cf: Config, cvs: Canvas, skill: Skill, isDraw: boolean = false, y: number, fontSize: number) {
    let line = ''
    let height = 0
    let numline = 0
    const text = skill.text

    applyText(cvs.ctx, cf.skText.textStyle)
    cvs.ctx.font = fontSize + "px FangZhengZhuYuan"

    var xoff = 0       // 首行缩进
    let drawRatio = 0  // 绘制单行时缩放的比例
    let isPunctuation = false // 是否将下一行的标点符号上移

    // 逐行绘制
    for (let i = 0; i < text.length; i++) {
        xoff = (numline === 0) ? cf.skText.indent * fontSize : 0
        line = line + text[i]
        const textWidth = cvs.ctx.measureText(line).width
        if (textWidth >= cf.skText.w - xoff) {
            // 确保标点符号不在第一位
            if (i + 1 < text.length && [',', '，', '.', '。', ';', '；', ':', '：'].indexOf(text[i + 1]) >= 0) {
                i = i + 1
                line = line + text[i]
                isPunctuation = true
            }
            if (isDraw) {
                drawRatio = drawLine(cf, cvs, line, fontSize, skill.isItalic, false, drawRatio, y + numline * fontSize, xoff)
            }
            numline++
            line = ''
            height = height + fontSize
        }
    }

    // 绘制最后一行
    if (line != '') {
        height = height + fontSize
        if (isDraw) {
            drawRatio = drawLine(cf, cvs, line, fontSize, skill.isItalic, true, drawRatio, y + numline * fontSize, xoff)
        }
    }
    return height
}

// 获取技能组高度
function skillsHeight(cf: Config, cvs: Canvas, card: Card, y1: number, fontSize: number, isDraw: boolean) {
    let heights = 0
    const skillsy: number[] = []  // 每个技能的起始y坐标
    for (let skill of card.skills) {
        const spacing = heights > 0 ? cf.skText.spacing * fontSize : 0
        skillsy.push(y1 + heights + spacing + fontSize / 2)
        const height = skillHeight(cf, cvs, skill, isDraw, y1 + heights + spacing + fontSize / 2, fontSize)
        heights = heights + spacing + height
    }
    return {
        height: heights,
        skillsy: skillsy
    }
}

// 绘制缺角矩形
function drawCornerRect(cvs: Canvas, rect: Rect, corner: number, isFill = false) {
    // 确定坐标
    const line = [
        rect.c1.down(corner), rect.c1.down(corner).right(corner), rect.c1.right(corner),
        rect.c2.left(corner), rect.c2.down(corner).left(corner), rect.c2.down(corner),
        rect.c3.up(corner), rect.c3.up(corner).left(corner), rect.c3.left(corner),
        rect.c4.right(corner), rect.c4.right(corner).up(corner), rect.c4.up(corner),
        rect.c1.down(corner)
    ]

    // 绘制
    cvs.ctx.beginPath()
    cvs.ctx.lineTo(line[0].x, line[0].y)
    for (let c of line.slice(1, line.length)) {
        cvs.ctx.lineTo(c.x, c.y)
    }
    isFill ? cvs.ctx.fill() : cvs.ctx.stroke()
    cvs.ctx.closePath()
}

// 绘制技能背景
function drawSkillBackground(cf: Config, cvs: Canvas, card: Card, miscellaneous: Miscellaneous, y1: number) {
    const alpha = transColor(cf.skBg.alpha)  // 透明度
    const color = miscellaneous.getColor(card.power) + alpha  // 颜色

    // 四角坐标
    const height = cf.skText.y2 - y1
    let rect = new Rect(cf.skText.x1, y1, cf.skText.w, height)
    rect = rect.scaleWidth(cf.skBg.wScale).scaleHeight(cf.skBg.hScale)

    // 绘制样式
    cvs.ctx.fillStyle = color
    cvs.ctx.lineWidth = cf.skBg.lineWidth
    cvs.ctx.strokeStyle = color

    // 绘制
    drawCornerRect(cvs, rect, cf.skBg.corner, false)
    drawCornerRect(cvs, rect.scale(-cf.skBg.margin), cf.skBg.corner, true)
}

// 绘制技能名外框
function drawSkillNameFrames(cf: Config, cvs: Canvas, card: Card, misellaneous: Miscellaneous, skillsy: number[]) {
    const s = misellaneous.getSkillbox(card.power)
    const img = misellaneous.getImg()
    if (img) {
        for (let dy of skillsy) {
            const d = {
                x: cf.skText.x1 + cf.skFrame.xoff, 
                y: dy + cf.skFrame.yoff, 
                w: cf.skFrame.w, 
                h: cf.skFrame.h
            }
            cvs.ctx.drawImage(img, s.x, s.y, s.w, s.h, d.x, d.y, d.w, d.h)
        }
    }
}

// 绘制技能名
function drawSkillNames(cf: Config, cvs: Canvas, card: Card, skillsy: number[]) {
    // 设置文本样式
    const textStyle = card.power === 'shen' ? cf.skName.shenTextStyle : cf.skName.textStyle
    applyText(cvs.ctx, textStyle)

    // 绘制技能名
    for (let i = 0; i < card.skills.length; i++) {
        const dy = skillsy[i]
        let text = card.skills[i].name
        const fontName = 'FangZhengLiShuJianTi'
        df.fontsTexts.fangzhengTexts = df.contrastAddFont(df.fontsTexts.fangzhengTexts, text, fontName, `/fonts/${fontName}/${fontName}`)

        // 逐字绘制
        for (let j = 0; j < Math.min(text.length, 2); j++) {
            cvs.ctx.font = cf.skName.fontSize + "px " + fontName + "-" + text[j]
            const d = {
                x: cf.skText.x1 + cf.skName.xoff + j * cf.skName.fontSize,
                y: dy + cf.skName.yoff
            }
            cvs.ctx.fillText(text[j], d.x, d.y)
        }
    }
}

// 绘制技能
export function drawSkills(cf: Config, cvs: Canvas, card: Card, miscellaneous: Miscellaneous) {
    const maxHeight = (cf.skText.y2 - cf.skText.maxy1) * cf.skText.maxHeight
    let y1 = cf.skText.maxy1          // 技能组顶部y坐标
    let fontSize = cf.skText.maxFont  // 技能组字体大小

    // 1. 确定技能组顶部y坐标和技能组字体大小
    let sh = skillsHeight(cf, cvs, card, y1, fontSize, false)
    while (fontSize >= 2 && sh.height > maxHeight) {
        fontSize--
        sh = skillsHeight(cf, cvs, card, y1, fontSize, false)
    }
    y1 = Math.min(cf.skText.y2 - sh.height, cf.skText.maxy1)

    // 2. 绘制技能组背景
    drawSkillBackground(cf, cvs, card, miscellaneous, y1)

    // 3. 绘制技能文本
    sh = skillsHeight(cf, cvs, card, y1, fontSize, true)

    // 4. 绘制技能名外框
    drawSkillNameFrames(cf, cvs, card, miscellaneous, sh.skillsy)

    // 5. 绘制技能名
    drawSkillNames(cf, cvs, card, sh.skillsy)

    return { topy: y1 }
}