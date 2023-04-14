importClass(android.content.Context);
importClass(android.provider.Settings);

const scriptStartTime = new Date().getTime();
const {env} = hamibot;
log('env=', env);
const dingTalkAppName = '钉钉';
let testingCaptureScreenEnabled = true;
let testingNotifyMsgEnabled = true;
let dingConf = storages.create("DingTalkConfig");
let swipeConfName = device.getAndroidId() + "_SWIPE_TIME";
let displayMetrics = context.getResources().getDisplayMetrics();
const w = displayMetrics.widthPixels;
const h = displayMetrics.heightPixels;
const floatWindow = floaty.rawWindow(
    <frame gravity='center' bg="#adfffff7">
        <text id='flow_text' textColor="#f0524f" bold="true" textSize="20sp">start the task</text>
    </frame>
);
floatWindow.setTouchable(false);
floatWindow.setPosition(5, h / 2);

threads.start(function () {
    setInterval(() => {
        toast("avoid to auto-lock", 1000);
    }, getLockTime());
});

(function () {
    unlockScreenIfNeeded();
    testOtherCode();
    checkEnv();
    checkInOrOut();
})()

function testOtherCode() {
    // console.show();
    // testingCaptureScreenEnabled = false;
    // testingNotifyMsgEnabled = false;
    // windowLogAndSleep1Second('begin test');
    // try {
    //     let i = undefined;
    //     let u = 1 / i;
    //     windowLogAndSleep1Second('u=' + u);
    // } catch (error){
    //     windowLogAndSleep1Second("error:" + error);
    // }
    // exitScript(0);
}

function setFloatText(txt) {
    ui.run(function () {
        floatWindow.flow_text.setText(txt);
    });
}

function checkEnv() {
    auto.waitFor();
    windowLogAndSleep1Second('accessibility service on.  isOnLockScreen:' + isOnLockScreen());
    const packageName = app.getPackageName(dingTalkAppName);
    log('get the packageName:', dingTalkAppName, '-->', packageName);
    if (packageName == null) {
        exitScript(-100, 'cannot found the app:' + dingTalkAppName);
        return;
    }
    windowLogAndSleep1Second("found the app:" + dingTalkAppName);
    notifyMsg('script started', 'script started on [' + getFormatDateTime(0) + ']');
}

function checkInOrOut() {
    killApp(dingTalkAppName);
    openApp(dingTalkAppName);
    let page = waitForPageLoaded(30);
    windowLogAndSleep1Second('current page is :' + page);
    goToCheckInPageFrom(page);
    sleep1Second();
    if (!isOnClockInPage(true)) {
        exitScript(-100, 'still not on clock-in page.');
        return false;
    }
    doCheckInOrOutWithConfig();
    return true;
}

function doCheckInOrOutWithConfig() {
    if (!isNeedCheckIn()) {
        return;
    }
    let checkInTip = '上班打卡';
    let checkInSuccessTip = '上班打卡成功';
    let checkOutTip = '下班打卡';
    let checkOutSuccessTip = '下班打卡成功';
    let leaveEarlyTip = '早退打卡备注';
    if (textExists(checkInTip)) {
        notifyMsg('ready', 'ready to check in[' + getFormatDateTime(0) + ']');
        sleep1Second();
        if (textClick(checkInTip)) {
            let limit = 20;
            if (tryCallUntil(limit, () => textExists(checkInSuccessTip), () => windowLogAndSleep1Second('waiting for [' + checkInSuccessTip + ']-' + (limit--)))) {
                exitScript(1);
            } else {
                exitScript(-1, 'timeout to check in');
            }
        } else {
            exitScript(-100, 'failed to click [' + checkInTip + ']');
        }
    } else if (textExists(checkOutTip)) {
        notifyMsg('ready', 'ready to check out[' + getFormatDateTime(0) + ']');
        sleep1Second();
        if (textClick(checkOutTip)) {
            let limit = 20;
            if (tryCallUntil(limit, () => textExists(checkOutSuccessTip) || textExists(leaveEarlyTip), () => windowLogAndSleep1Second('waiting for [下班打卡成功]-' + (limit--)))) {
                if (textExists(checkOutSuccessTip)) {
                    exitScript(2);
                } else if (textExists(leaveEarlyTip)) {
                    exitScript(-2, 'cannot deal with:' + leaveEarlyTip);
                }
            } else {
                exitScript(-2, 'timeout to check out');
            }
        } else {
            exitScript(-100, 'failed to click [' + checkOutTip + ']');
        }
    } else {
        exitScript(-100, 'not exists [' + checkInTip + '] or [' + checkOutTip + ']');
    }
}

function screenshotsAndUpload(fileNameSuffix) {
    log('testingCaptureScreenEnabled ? :' + testingCaptureScreenEnabled);
    if (!testingCaptureScreenEnabled) {
        return null;
    }
    let start = new Date().getTime();
    let timeMs;
    if (!requestScreenCapture()) {
        timeMs = new Date().getTime() - start;
        log('cannot attain the screen capture permission, time cost:' + timeMs + 'ms');
        return null;
    }
    timeMs = new Date().getTime() - start;
    log('attained the screen capture permission, time cost:' + timeMs + 'ms');
    getFormatDateTime(3);
    let fileName = getFormatDateTime(3) + "-" + fileNameSuffix + ".png";
    let saveScreenshotFilePath = files.join(files.getSdcardPath(), "DCIM", "Screenshots", fileName);
    files.createWithDirs(saveScreenshotFilePath);
    start = new Date().getTime();
    captureScreen(saveScreenshotFilePath);
    timeMs = new Date().getTime() - start;
    if (tryCallUntil(3, () => files.exists(saveScreenshotFilePath), emptyFunction)) {
        log('success to screenshots:' + saveScreenshotFilePath + ', time cost:' + timeMs + 'ms');
        start = new Date().getTime();
        let imgUrl = uploadImageAndGetLink(saveScreenshotFilePath);
        timeMs = new Date().getTime() - start;
        log('upload img file cost:' + timeMs + 'ms');
        return imgUrl;
    } else {
        log('capture screen failed.');
        return null;
    }
}

function isNeedCheckIn() {
    return true;
}

function goToCheckInPageFrom(currentPage) {
    switch (currentPage) {
        case 'home':
            if (!tryCallUntil(10, () => textExists('打卡'), () => {
                id('home_app_item').findOne(100).click();
            })) {
                exitScript(-100, 'cannot find the text[打卡] in app-home page');
                return;
            }
            windowLogAndSleep1Second('clicking [打卡] in app-home');
            if (!textClick("打卡")) {
                exitScript(-100, 'failed to click [打卡]');
                return;
            }
            if (tryCallUntil(5, () => textExists('选择打卡企业'), emptyFunction)) {
                windowLogAndSleep1Second('multiple companies found');
                if (isEmptyString(env.companyName)) {
                    exitScript(-100, "not config the 'companyName'");
                } else {
                    windowLogAndSleep1Second('clicking the company:[' + env.companyName + ']');
                    textClick(env.companyName);
                }
            }
            let limit = 20;
            if (!tryCallUntil(limit, () => isOnClockInPage(true), () => windowLog('waiting for clock-in page:' + limit--))) {
                exitScript(-100, 'timeout to goto clock-in page!!!');
                return;
            }
            windowLogAndSleep1Second('current in the clock-in page !');
            break;
        case 'login':
            loginToApp();
            goToCheckInPageFrom('home');
            break;
        case 'clock-in':
        default:
            break;
    }
}

function loginToApp() {
    if (isEmptyString(env.dingtalkAccount)) {
        exitScript(-100, 'dingtalkAccount not configured.');
        return;
    }
    if (isEmptyString(env.dingtalkPwd)) {
        exitScript(-100, 'dingtalkPwd not configured.');
        return;
    }
    var phonenumInput = id("et_phone_input").findOne(1000);
    if (!tryCallUntil(9, () => phonenumInput != null, () => {
        phonenumInput = id("et_phone_input").findOne(100);
    })) {
        exitScript(-100, 'account input not found.' + phonenumInput);
        return;
    }
    windowLogAndSleep1Second('found account input.');
    const pwdInput = id("et_password").findOne(2000);
    if (pwdInput == null) {
        exitScript(-100, 'password input not found.');
        return;
    }
    windowLogAndSleep1Second('found password input.');
    phonenumInput.setText(env.dingtalkAccount);
    pwdInput.setText(env.dingtalkPwd);
    windowLogAndSleep1Second('success to set dingtalk account and password.');

    var cbPrivacy = id('cb_privacy').findOne(2000);
    if (cbPrivacy == null) {
        exitScript(-100, 'privacy checkbox not found.');
        return;
    }
    windowLogAndSleep1Second('found privacy checkbox.');
    if (!cbPrivacy.checked()) {
        cbPrivacy.click();
    }
    windowLogAndSleep1Second('checked privacy checkbox:' + cbPrivacy.checked());

    if (!tryCallUntil(1, () => !textOrDescExists('登录'), () => {
        textClick('登录');
        windowLogAndSleep1Second('clicking the button:[登录]');
    })) {
        exitScript(-100, 'failed to click the button:[登录]');
    }
    const page = waitForPageLoaded(20);
    if (page !== 'home') {
        let msg;
        if (page === 'login-with-wrong-pwd') {
            const errorMsg = textContains('密码错误').findOne().text();
            msg = 'got msg after clicking login button:' + errorMsg;
            textClick('确认');
        } else {
            msg = 'login timeout.';
        }
        exitScript(-100, msg);
    }
}

function waitForPageLoaded(limit) {
    let page = 'unknown';
    while (limit-- > 0) {
        windowLogAndSleep1Second('waiting for page loaded...' + limit);
        if (textOrDescExists("登录") && textOrDescExists('密码')) {
            page = "login";
            break;
        } else if (textOrDescExists("消息")
            && textOrDescExists("协作")
            && textOrDescExists("工作台")
            && textOrDescExists("通讯录")
            && textOrDescExists("我的")) {
            page = "home";
            break;
        } else if (isOnClockInPage(true)) {
            page = "clock-in";
            break;
        } else if (isOnClockInPage(false)) {
            page = "clock-in-other";
            break;
        } else if (textOrDescExists('迟到打卡备注')) {
            page = "clock-in-late";
            break;
        } else if (textOrDescExists('早退打卡备注')) {
            page = "clock-in-leave-early";
            break;
        } else if (textContains('号码或密码错误').findOne(100) != null) {
            page = 'login-with-wrong-pwd';
            break;
        }
        sleep1Second();
    }
    log('loaded the page:', page);
    return page;
}

function isOnClockInPage(exactly) {
    return (!exactly || textOrDescExists("申请")) && textOrDescExists("打卡") && textOrDescExists('统计') && textOrDescExists('设置');
}

function openApp(appName) {
    windowLogAndSleep1Second('opening the app:' + appName);
    launchApp(appName);
}

function unlockScreenIfNeeded() {
    while (!device.isScreenOn()) {
        windowLogAndSleep1Second('the device screen is not on, wakeup it.');
        device.wakeUpIfNeeded();
        sleep1Second();
    }
    windowLogAndSleep1Second('the screen on.')

    if (!isOnLockScreen()) {
        windowLogAndSleep1Second('the device already unlocked.')
        return;
    }

    function screenLockedStatus() {
        let km = context.getSystemService(Context.KEYGUARD_SERVICE);
        return km.isKeyguardLocked() && km.isKeyguardSecure();
    }

    if (!screenLockedStatus()) {
        windowLogAndSleep1Second("current screen does not need to be unlocked by password");
        swipeUp();
    } else {
    }
    windowLogAndSleep1Second("success to unlock.");
}

function swipeUp() {
    windowLogAndSleep1Second('start to swipe up to unlock')
    if (swipeUpOperation()) {
        windowLogAndSleep1Second("success to swipe up to unlock");
    } else {
        windowLogAndSleep1Second("cannot to swipe up to unlock");
        exitScript(-100);
    }
}

function swipeUpOperation() {
    let swipeTime = 0;
    if (dingConf.contains(swipeConfName)) {
        swipeTime = dingConf.get(swipeConfName);
        windowLogAndSleep1Second('found previous swipe time:', swipeTime);
        for (let i = 0; i < 3; i++) {
            gesture(swipeTime, [w / 2, h * 0.8], [w / 2, h * 0.1]);
            sleep1Second();
            if (!isOnLockScreen()) {
                log('swipe up operation success, using the previous swipeTime:', swipeTime);
                dingConf.put(swipeConfName, swipeTime);
                return true;
            }
        }
    }
    swipeTime = 0;
    let appendTime = 20;
    for (let i = 0; i < 20; i++) {
        swipeTime += appendTime;
        windowLogAndSleep1Second('current swipeTime is ', swipeTime);
        gesture(swipeTime, [w / 2, h * 0.8], [w / 2, h * 0.1]);
        sleep1Second();
        if (!isOnLockScreen()) {
            windowLogAndSleep1Second('swipe up operation success, store the swipeTime:', swipeTime);
            dingConf.put(swipeConfName, swipeTime);
            return true;
        }
    }
    return false;
}

function isOnLockScreen() {
    let km = context.getSystemService(Context.KEYGUARD_SERVICE);
    if (km.inKeyguardRestrictedInputMode()) {
        log('isOnLockScreen: inKeyguardRestrictedInputMode');
        return true;
    }
    let r = 0;
    for (let i = 0; i < 10; i++) {
        if (text(i).exists() && desc(i).exists()) {
            r++;
        }
    }
    if (r === 10) {
        log('isOnLockScreen: found 10 digitals');
    }
    return r === 10;
}

function exitScript(code, msg) {
    sleep1Second();
    if (code > 0) {
        windowLogAndSleep1Second('execute the scrip successfully, exit...');
    }
    let imgUrl;
    let title;
    let content;
    if (code === 1) {
        title = 'success';
        content = 'success to check in [' + getFormatDateTime(0) + ']';
    } else if (code === 2) {
        title = 'success';
        content = 'success to check out [' + getFormatDateTime(0) + ']';
    } else if (code === -1) {
        title = 'failed';
        content = 'failed to check in [' + getFormatDateTime(0) + ']';
    } else if (code === -2) {
        title = 'failed';
        content = 'failed to check out [' + getFormatDateTime(0) + ']';
    } else if (code === -100) {
        title = 'other-failed';
    } else {
        title = 'test';
        content = 'test success';
    }
    if (msg) {
        content += msg;
        windowLogAndSleep1Second(msg);
    }
    imgUrl = screenshotsAndUpload(title);
    let scriptCostSec = (new Date().getTime() - scriptStartTime) / 1000.0;
    notifyMsg(title, content + ', time cost:' + scriptCostSec + ' seconds', imgUrl);
    if (code !== 0) {
        postExit();
    }
    if (code < 0) {
        windowLogAndSleep1Second('open hamibot console for log content');
        app.startActivity('console');
    }
    hamibot.exit();
}

function postExit() {
    if (env.exitAppPost) {
        windowLogAndSleep1Second('kill the app post exit.');
        killApp(dingTalkAppName);
    }
    if (env.lockScreenPost) {
        windowLogAndSleep1Second('lock the screen post exit.');
        lockScreenInHome();
    }
}

function uploadImageAndGetLink(filePath) {
    windowLogAndSleep1Second('ready to upload the file:' + filePath);
    let res = null;
    try {
        res = http.postMultipart('https://imgs.top/api/v1/upload', {
            file: open(filePath)
        }, {
            headers: {
                Authorization: 'Bearer ' + env.uploadImgToken
            }
        });
    } catch (err) {
        windowLogAndSleep1Second('upload img error:' + err);
    }
    if (res == null || res.body == null) {
        windowLogAndSleep1Second('failed to upload img with empty response');
        return null;
    }

    const responseJson = res.body.json();
    if (responseJson.status) {
        const url = responseJson.data.imgurl
        windowLogAndSleep1Second('upload success, the img url:' + url);
        return url;
    } else {
        windowLogAndSleep1Second('upload failed msg:' + responseJson.message);
        return null;
    }
}

function getLockTime() {
    let lockTime = Settings.System.getInt(context.getContentResolver(), Settings.System.SCREEN_OFF_TIMEOUT);
    log('lockTime:', lockTime);
    if (null == lockTime || "" === lockTime || "undefined" === lockTime) {
        return 4000;
    }
    return lockTime / 2;
}

function textClick(s) {
    let uiObj = text(s).findOne();
    if (uiObj != null) {
        if (uiObj.click()) {
            windowLogAndSleep1Second('component clicked text[' + s + ']');
            return true;
        } else {
            let bounds = uiObj.bounds();
            let centerX = bounds.centerX();
            let centerY = bounds.centerY();
            let clicked = click(centerX, centerY);
            windowLogAndSleep1Second('[' + centerX + ',' + centerY + ']clicked text[' + s + ']:' + clicked);
            return clicked;
        }
    }
    return false;
}

function idClick(componentId) {
    let uiObj = id(componentId).findOne();
    if (uiObj != null) {
        if (uiObj.click()) {
            return true;
        } else {
            let bounds = uiObj.bounds();
            let centerX = bounds.centerX();
            let centerY = bounds.centerY();
            return click(centerX, centerY);
        }
    }
    return false;
}

function textOrDescExists(s) {
    return text(s).exists() || desc(s).exists();
}

function textExists(s) {
    return text(s).exists();
}

function callUntil1(predicateFunc) {
    return callUntil2(predicateFunc, emptyFunction);
}

function callUntil2(predicateFunc, func) {
    for (let i = 0; i > -1; i++) {
        let r = predicateFunc();
        if (!r) {
            func();
            sleep1Second();
        } else {
            return true;
        }
    }
    return false;
}

function tryCallUntil(times, exitPredicate, func) {
    for (let i = 0; i < times; i++) {
        if (exitPredicate()) {
            return true;
        } else {
            func();
            sleep1Second();
        }
    }
    return false;
}

function killApp(appName) {
    let isKillAppSuccess = false;
    let packageName = app.getPackageName(appName);
    if (app.openAppSetting(packageName)) {
        windowLogAndSleep1Second('enter app-setting page')
        tryCallUntil(5, () => {
            if (text("结束运行").exists()) {
                textClick("结束运行");
                windowLogAndSleep1Second('textClick [结束运行]');
                sleep1Second();
                if (text("确定").exists()) {
                    textClick("确定");
                    windowLogAndSleep1Second('textClick [结束运行-确定]');
                }
                sleep1Second();
                isKillAppSuccess = text("结束运行").exists();
            } else if (text("强行停止").exists()) {
                textClick("强行停止");
                windowLogAndSleep1Second('textClick [强行停止]');
                sleep1Second();
                if (text("确定").exists()) {
                    textClick("确定");
                    windowLogAndSleep1Second('textClick [强行停止-确定]');
                }
                sleep1Second();
                isKillAppSuccess = text("强行停止").exists();
            } else {
                windowLogAndSleep1Second('not support to kill app');
                exitScript(-100);
                isKillAppSuccess = false;
            }
            return isKillAppSuccess;
        }, emptyFunction);
    }
    if (isKillAppSuccess) {
        windowLogAndSleep1Second('success to kill the app');
    } else {
        windowLogAndSleep1Second('failed to kill the app');
    }
    sleep(2000);
    return isKillAppSuccess;
}

function lockScreenInHome() {
    home();
    sleep1Second();
    desc("锁屏").findOne().click();
}

function sleep1Second() {
    sleep(1000);
}

function windowLogAndSleep1Second(s) {
    setFloatText(s);
    log(s);
    sleep1Second();
}

function windowLog(s) {
    setFloatText(s);
    log(s);
}

function isNonEmptyString(str) {
    return typeof str === 'string' && str.trim() !== '';
}

function isEmptyString(str) {
    return !isNonEmptyString(str);
}

function emptyFunction() {
}

function getFormatDateTime(format) {
    let date = new Date();
    let year = date.getFullYear();
    let month = date.getMonth() + 1;
    let day = date.getDate();
    let hour = date.getHours();
    let minute = date.getMinutes();
    let second = date.getSeconds();

    if (month < 10) {
        month = "0" + month;
    }
    if (day < 10) {
        day = "0" + day;
    }
    if (hour < 10) {
        hour = "0" + hour;
    }
    if (minute < 10) {
        minute = "0" + minute
    }
    if (second < 10) {
        second = "0" + second;
    }

    switch (format) {
        case 1:
            return year + "/" + month + "/" + day
        case 2:
            return year + "-" + month + "-" + day
        case 3:
            return year + "-" + month + "-" + day + "-" + hour + "-" + minute + "-" + second;
        default:
            return year + "/" + month + "/" + day + " " + hour + ":" + minute + ":" + second;
    }
}

function notifyMsg(title, content, imgUrl) {
    if (!testingNotifyMsgEnabled || !env.notifyMsg || isEmptyString(env.pushplusToken)) {
        windowLogAndSleep1Second('notify disabled or token is empty.');
        return;
    }
    windowLogAndSleep1Second('notify title:' + title + ', content:' + content);
    const token = env.pushplusToken;
    let finalContent;
    if (imgUrl) {
        finalContent = "<p>" + content + "</p><img src='" + imgUrl + "' />";
    } else {
        finalContent = content;
    }
    const url = "http://www.pushplus.plus/send?title=" + encodeURIComponent(title) + "&content=" + encodeURIComponent(finalContent) + "&token=" + token + "&channel=wechat";
    http.get(url);
}