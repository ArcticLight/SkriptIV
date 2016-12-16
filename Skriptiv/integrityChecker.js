let fs = require('fs')
let pathroot = `${__dirname}/../Defects-Sources`

function log(s) {
    console.log("[CHECKER] " + s)
}

function getInfoFor(bug) {
    let info = require(`${pathroot}/${bug}/info.json`)

    if (!info
     || !info.bugTitle 
     || !info.bugLocation
     || !info.bugDescription
     || !info.fileName) {
         throw("The info object for this task was incomplete!")
     }

    return info;
}

function checkResponses(bug, config) {
    return !(!bug
            || !bug.correctResponses
            || !bug.correctResponses[config]
            || !bug.correctResponses[config].length
            || bug.correctResponses[config].length == 0)
}

function checkConfigExists(bug, conf) {
    let a = fs.existsSync(`${pathroot}/${bug.bugTitle}/${bug.fileName}-bugged-${conf}.java`)
    let b = fs.existsSync(`${pathroot}/${bug.bugTitle}/${bug.fileName}-fixed-${conf}.java`)
    return (a && b)
}

function checkLicenseExists(bug) {
    return fs.existsSync(`${pathroot}/${bug.bugTitle}/LICENSE.txt`)
}

function checkConfigBWhitespace(bug) {
    if(!checkConfigExists(bug, "B")) {
        throw("Config B does not exist for this file!")
    }

    let sv = function(bug, bv) {
        let file = fs.readFileSync(`${pathroot}/${bug.bugTitle}/${bug.fileName}-${bv}-B.java`, 'utf-8')
            .split("\n")
        
        let previousLineWasBlank = true

        for(let i = 0; i < file.length; i++) {
            if(file[i].length > 100) {
                throw(`${bug.bugTitle} conf ${bv}-B has a >100 column long line at ${i}!`)
            }

            let thisLine = file[i].trim()
            let thisLineIsBlank = (thisLine === "")

            if(thisLineIsBlank && previousLineWasBlank) {
                throw(`${bug.bugTitle} conf ${bv}-B has two consecutive blank lines at ${i}!`)
            }

            previousLineWasBlank = thisLineIsBlank
        }
    }

    return sv(bug, "bugged") && sv(bug, "fixed")
}

function checkConfigAWhitespace(bug) {
    if(!checkConfigExists(bug, "A")) {
        throw("Config A does not exist for this file!")
    }

    let sv = function(bug, bv) {
        let file = fs.readFileSync(`${pathroot}/${bug.bugTitle}/${bug.fileName}-${bv}-A.java`, 'utf-8')
            .split("\n")
        
        let previousLineWasBlank = true
        let twoLinesAgoWereBlank = true
        let previousLineWasComment = false

        for(let i = 0; i < file.length; i++) {
            let thisLine = file[i].trim()
            //technically untrimmed, need to remove \r on windows though to get accurate counts.
            let untrimmedLine = file[i].replace(new RegExp("\r", "g"), "")
            let thisLineIsBlank = (thisLine === "")
            let thisLineStartsComment = (thisLine.startsWith("//") || thisLine.startsWith("/*"))
            let thisLineEndsComment = (thisLine.startsWith("//") || thisLine.endsWith("*/"))

            //Assume that lines which - when trimmed start with *, and where previousLineWasComment is true - are inside Javadoc comments.
            let thisLineInBlockComment = (thisLine.startsWith("/*") || thisLine.endsWith("*/")
                || (thisLine.startsWith("*") && previousLineWasComment))

            let thisLineIsComment = (thisLineStartsComment || thisLineEndsComment || thisLineInBlockComment)

            if(thisLineIsBlank && previousLineWasBlank && twoLinesAgoWereBlank) {
                throw(`${bug.bugTitle} conf ${bv}-A has three blank lines in a row at ${i}!`)
            }

            if(thisLineStartsComment) {
                if(!previousLineWasBlank && !previousLineWasComment) {
                    throw(`${bug.bugTitle} conf ${bv}-A has a comment which is not preceeded by a blank line or comment at ${i}!`)
                }
            }

            if(thisLineInBlockComment) {
                //Need to use original (untrimmed) length
                if(untrimmedLine.length > 70) {
                    throw(`${bug.bugTitle} conf ${bv}-A has a >70 column line in a block comment at ${i}!\n"${file[i]}"`)
                }
            } else if(untrimmedLine.length > 80) {
                throw(`${bug.bugTitle} conf ${bv}-A has a >80 column line outside a block comment at ${i}!\n"${file[i]}"`)
            }

            if(thisLine.startsWith("}") && previousLineWasBlank) {
                throw(`Blocks shouldn't end with blank lines in ${bug.bugTitle}-${bv}-A at ${i}!`)
            }

            previousLineWasComment = thisLineIsComment
            twoLinesAgoWereBlank = previousLineWasBlank
            previousLineWasBlank = thisLineIsBlank
        }

        return true;
    }

    return sv(bug, "bugged") && sv(bug, "fixed")
}

exports.check = function() {
    log("Beginning sanity check of task files...")
    let tasks = {}

    try {
        tasks = require(`${pathroot}/tasks.json`)
    } catch(e) {
        log("!!! Failed to get task description !!!")
        return false;
    }

    log("Verifying control task...")
    try {
        let controlTask = getInfoFor(tasks.control.bugTitle)

        if(tasks.control.config === "A") checkConfigAWhitespace(controlTask)
        if(tasks.control.config === "B") checkConfigBWhitespace(controlTask)

        if (!checkConfigExists(controlTask, tasks.control.config)
         || !checkResponses(controlTask, tasks.control.config)) {
            throw("Something was wrong with the task's info.json!")
        }

        if(!checkLicenseExists(controlTask)) {
            throw("This task doesn't contain the original sourcecode license!")
        }

        if(typeof controlTask.flipped !== "undefined") {
            throw("Control task must declare if it is flipped or not!")
        }
    } catch(e) {
        log(`!!! Failed to verify (control) task "${tasks.control.bugTitle}" !!!`)
        log(`The error: ${e}`)
        return false;
    }

    log("Verifying remaining task(s) ...")
    for(let i = 0; i < tasks.taskList.length; i++) {
        log(`Verifying task "${tasks.taskList[i]}" ...`)
        let taskName = tasks.taskList[i]
        try {
            let task = getInfoFor(taskName)

            checkConfigAWhitespace(task)
            checkConfigBWhitespace(task)

            if(!checkConfigExists(task, "A")
                    || !checkConfigExists(task, "B")
                    || !checkConfigExists(task, "C")) {
                throw("A config was missing!")
            } else if(!checkResponses(task, "A")
                    || !checkResponses(task, "B")
                    || !checkResponses(task, "C")) {
                throw("Some task responses were missing!")
            }

            if(!checkLicenseExists(task)) {
                throw("This task doesn't contain the original sourcecode license!")
            }
        } catch(e) {
            log(`!!! Failed to verify task "${taskName}" !!!`)
            log(`The error: ${e}`)
            return false;
        }
    }

    return true;
}