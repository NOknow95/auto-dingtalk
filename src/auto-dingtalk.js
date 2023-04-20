importClass(android.content.Context);
importClass(android.provider.Settings);

log('===start script===');
const scriptStartTime = new Date().getTime();
const {env} = hamibot;
// log('env=', env);
const dingTalkAppName = '钉钉';
let errCode = -100;
let testingCaptureScreenEnabled = true;
let testingNotifyMsgEnabled = true;
let testingExitAppPostEnabled = true;
let testingLockScreenPostEnabled = true;
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
    //testOtherCode();
    checkEnvAndConfig();
    restartApp();
    loginToAppIfNeed();
    gotoClockInPage()
    checkInOrOut();
})()
log('===end script===');

function testOtherCode() {
    // console.show();
    testingCaptureScreenEnabled = false;
    testingNotifyMsgEnabled = false;
    testingExitAppPostEnabled = false;
    testingLockScreenPostEnabled = false;
    errCode = 0;
    windowLogAndSleep('begin test');
    //----------------------------------
    // restartApp();
    // checkIfAccountCorrect('王建文ᯤ⁶ᴳ');
    loginToAppIfNeed('15980269867', 'ddWjw19951', 'jwtest');
    //----------------------------------
    windowLogAndSleep('end test');
    exitScript(0);
}

function restartApp() {
    killApp(dingTalkAppName);
    openApp(dingTalkAppName);
}

function loginToAppIfNeed(dingtalkAccount, dingtalkPwd, userInfoName) {
    let page = currentPage();
    const times = 30;
    if (tryCallUntil(times, () => (page = currentPage()) === 'login' || page === 'home', (i) => windowLog('waiting for the login/home page...' + i))) {
        if (page === 'login') {
            //---------------------
            windowLogAndSleep('current page is:login, ready to login');
            loginToApp(dingtalkAccount, dingtalkPwd);
            //---------------------
        } else {
            windowLogAndSleep('current page is:home, no need to login', 2000);
            if (checkIfAccountCorrect(userInfoName)) {
                if (!tryCallUntil(3, () => currentPage() === 'home', () => back())) {
                    exitScript(errCode, 'cannot back to app-home after checking account');
                }
            } else {
                if (!tryCallUntil(5, () => textExists('我的信息'), () => textClick('设置'))) {
                    exitScript(errCode, 'cannot goto app-setting page');
                }
                windowLogAndSleep('on the app-setting page');
                if (!tryCallUntil(5, () => textExists('确认'), () => textClick('退出登录'))) {
                    exitScript(errCode, 'failed to click [退出登录]');
                }
                if (tryCallUntil(20, () => currentPage() === 'login', () => {
                    if (textExists('确认')) {
                        textClick('确认');
                    }
                })) {
                    //---------------------
                    windowLogAndSleep('success to logout. current page is:login, ready to login');
                    loginToApp(dingtalkAccount, dingtalkPwd);
                    //---------------------
                } else {
                    exitScript(errCode, 'failed to click [确认] to logout');
                }
            }
        }
    }
}

function checkIfAccountCorrect(userInfoName) {
    if (isEmptyString(userInfoName) && isEmptyString(env.userInfoName)) {
        windowLogAndSleep('no need to check if account correct');
        return true;
    }
    if (currentPage() !== 'home') {
        exitScript(errCode, 'make sure current page is:home');
    }
    if (tryCallUntil(5, () => textExists('设置') && textExists('客服与帮助'), i => idClick('my_avatar'))) {
        windowLogAndSleep('found [设置] and [客服与帮助] after click avatar in home page');
        if (tryCallUntil(3, () => textExists(userInfoName))) {
            windowLogAndSleep('the account is correct');
            return true;
        } else {
            windowLogAndSleep('the account is not correct');
        }
    } else {
        exitScript(errCode, 'cannot found text[设置] after click avatar in home page');
    }
    return false;
}

function setFloatText(txt) {
    ui.run(function () {
        floatWindow.flow_text.setText(txt);
    });
}

function checkEnvAndConfig() {
    auto.waitFor();
    windowLogAndSleep('accessibility service on.  isOnLockScreen:' + isOnLockScreen());
    const packageName = app.getPackageName(dingTalkAppName);
    log('get the packageName:', dingTalkAppName, '-->', packageName);
    if (packageName == null) {
        exitScript(errCode, 'cannot found the app:' + dingTalkAppName);
        return;
    }
    windowLogAndSleep("found the app:" + dingTalkAppName);
    notifyMsg('script started', 'script started on [' + getFormatDateTime(0) + ']');
}

function checkInOrOut(dingtalkAccount, dingtalkPwd, companyName) {
    function isNeedCheckIn(dingtalkAccount, dingtalkPwd, companyName) {
        return true;
    }

    if (!isNeedCheckIn(dingtalkAccount, dingtalkPwd, companyName)) {
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
            if (tryCallUntil(limit, () => textExists(checkInSuccessTip), () => windowLogAndSleep('waiting for [' + checkInSuccessTip + ']-' + (limit--)))) {
                exitScript(1);
            } else {
                exitScript(-1, 'timeout to check in');
            }
        } else {
            exitScript(errCode, 'failed to click [' + checkInTip + ']');
        }
    } else if (textExists(checkOutTip)) {
        notifyMsg('ready', 'ready to check out[' + getFormatDateTime(0) + ']');
        sleep1Second();
        if (textClick(checkOutTip)) {
            let limit = 20;
            if (tryCallUntil(limit, () => textExists(checkOutSuccessTip) || textExists(leaveEarlyTip), () => windowLogAndSleep('waiting for [下班打卡成功]-' + (limit--)))) {
                if (textExists(checkOutSuccessTip)) {
                    exitScript(2);
                } else if (textExists(leaveEarlyTip)) {
                    exitScript(-2, 'cannot deal with:' + leaveEarlyTip);
                }
            } else {
                exitScript(-2, 'timeout to check out');
            }
        } else {
            exitScript(errCode, 'failed to click [' + checkOutTip + ']');
        }
    } else {
        exitScript(errCode, 'not exists [' + checkInTip + '] or [' + checkOutTip + ']');
    }
}

function screenshotsAndUpload(fileNameSuffix) {
    log('testingCaptureScreenEnabled :' + testingCaptureScreenEnabled);
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
    if (tryCallUntil(3, () => files.exists(saveScreenshotFilePath))) {
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

function gotoClockInPage() {
    let times = 30;
    if (!tryCallUntil(times, () => currentPage() === 'home', i => windowLog('waiting for app-home page...' + i))) {
        exitScript(errCode, 'make sure current page is on app-home');
    }
    times = 10;
    if (!tryCallUntil(times, () => textExists('打卡'), i => windowLog('waiting for text[打卡] in app-home page...' + i))) {
        exitScript(errCode, 'cannot find the text[打卡] in app-home page');
    }
    windowLogAndSleep('clicking [打卡] in app-home');
    if (!textClick("打卡")) {
        exitScript(errCode, 'failed to click [打卡]');
    }
    if (tryCallUntil(5, () => textExists('选择打卡企业'))) {
        windowLogAndSleep('multiple companies found');
        if (isEmptyString(env.companyName)) {
            exitScript(errCode, "not config the 'companyName'");
        } else {
            windowLogAndSleep('clicking the company:[' + env.companyName + ']');
            textClick(env.companyName);
        }
    }
    let limit = 20;
    if (!tryCallUntil(limit, () => isOnClockInPage(true), () => windowLog('waiting for clock-in page:' + limit--))) {
        if (limit === 0) {
            exitScript(errCode, 'timeout to goto clock-in page!!!');
        } else {
            exitScript(errCode, 'still not on clock-in page.');
        }
    } else {
        windowLogAndSleep('current in the clock-in page !');
    }
}

function loginToApp(dingtalkAccount, dingtalkPwd) {
    if (isEmptyString(dingtalkAccount ? dingtalkAccount : env.dingtalkAccount)) {
        exitScript(errCode, 'dingtalkAccount not configured.');
        return;
    }
    if (isEmptyString(dingtalkPwd ? dingtalkPwd : env.dingtalkPwd)) {
        exitScript(errCode, 'dingtalkPwd not configured.');
        return;
    }
    const epi = 'et_phone_input';
    let etPhoneInput = id(epi).findOne(1000);
    if (!tryCallUntil(9, () => (etPhoneInput = id(epi).findOne(100)) != null, i => windowLog('looking up the [' + epi + ']...' + i))) {
        exitScript(errCode, 'account input not found:' + etPhoneInput);
        return;
    }
    windowLogAndSleep('found account input.');
    const ep = 'et_password';
    const etPassword = id(ep).findOne(2000);
    if (etPassword == null) {
        exitScript(errCode, 'password input not found.');
        return;
    }
    windowLogAndSleep('found password input.');
    etPhoneInput.setText(env.dingtalkAccount);
    etPassword.setText(env.dingtalkPwd);
    windowLogAndSleep('success to set dingtalk account and password.');

    var cbPrivacy = id('cb_privacy').findOne(2000);
    if (cbPrivacy == null) {
        exitScript(errCode, 'privacy checkbox not found.');
        return;
    }
    windowLogAndSleep('found privacy checkbox.');
    if (!cbPrivacy.checked()) {
        cbPrivacy.click();
    }
    windowLogAndSleep('checked privacy checkbox:' + cbPrivacy.checked());

    textClick('登录');
    let page;
    tryCallUntil(20, () => (page = currentPage()) === 'home' || page === 'login-with-wrong-pwd', i => windowLog('waiting for home page...' + i));
    if (page === 'home') {
        windowLog('success to login and current is on app-home page');
        return;
    }
    let msg;
    if (page === 'login-with-wrong-pwd') {
        const errorMsg = textContains('密码错误').findOne(1000).text();
        msg = 'got msg after clicking login button:' + errorMsg;
    } else {
        msg = 'timeout to login.';
    }
    exitScript(errCode, msg);
}

function waitForPageLoaded(limitSeconds, notShowCountDownWindowLog) {
    let countDown = limitSeconds;
    let page = 'unknown';
    while (limitSeconds-- > 0) {
        if (!notShowCountDownWindowLog) {
            windowLog('waiting for page loaded...' + (countDown--));
        }
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

function currentPage() {
    let page;
    if (textOrDescExists("登录") && textOrDescExists('密码')) {
        page = "login";
    } else if (textOrDescExists("消息")
        && textOrDescExists("协作")
        && textOrDescExists("工作台")
        && textOrDescExists("通讯录")
        && textOrDescExists("我的")) {
        page = "home";
    } else if (textExists('暂不更新') && textExists('更新')) {
        textClick('暂不更新');
        page = currentPage();
    } else if (isOnClockInPage(true)) {
        page = "clock-in";
    } else if (isOnClockInPage(false)) {
        page = "clock-in-other";
    } else if (textOrDescExists('迟到打卡备注')) {
        page = "clock-in-late";
    } else if (textOrDescExists('早退打卡备注')) {
        page = "clock-in-leave-early";
    } else if (textContains('号码或密码错误').findOne(100) != null) {
        page = 'login-with-wrong-pwd';
    } else {
        page = 'unknown';
    }
    return page;
}

function isOnClockInPage(exactly) {
    return (!exactly || textOrDescExists("申请")) && textOrDescExists("打卡") && textOrDescExists('统计') && textOrDescExists('设置');
}

function openApp(appName) {
    windowLogAndSleep('opening the app:' + appName);
    launchApp(appName);
}

function unlockScreenIfNeeded() {
    let i = 0;
    while (!device.isScreenOn()) {
        windowLogAndSleep('the device screen is not on, wakeup it.[' + (i++) + ']');
        device.wakeUpIfNeeded();
    }
    windowLogAndSleep('the screen on.')

    if (!isOnLockScreen()) {
        windowLogAndSleep('the device already unlocked.')
        return;
    }

    function screenLockedStatus() {
        let km = context.getSystemService(Context.KEYGUARD_SERVICE);
        return km.isKeyguardLocked() && km.isKeyguardSecure();
    }

    if (!screenLockedStatus()) {
        windowLogAndSleep("current screen does not need to be unlocked by password");
        swipeUp();
    } else {
    }
    windowLogAndSleep("success to unlock.");
}

function swipeUp() {
    windowLogAndSleep('start to swipe up to unlock')
    if (swipeUpOperation()) {
        windowLogAndSleep("success to swipe up to unlock");
    } else {
        windowLogAndSleep("cannot to swipe up to unlock");
        exitScript(errCode);
    }
}

function swipeUpOperation() {
    let swipeTime = 0;
    if (dingConf.contains(swipeConfName)) {
        swipeTime = dingConf.get(swipeConfName);
        windowLogAndSleep('found previous swipe time:', swipeTime);
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
        windowLogAndSleep('current swipeTime is ', swipeTime);
        gesture(swipeTime, [w / 2, h * 0.8], [w / 2, h * 0.1]);
        sleep1Second();
        if (!isOnLockScreen()) {
            windowLogAndSleep('swipe up operation success, store the swipeTime:', swipeTime);
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
        windowLogAndSleep('execute the scrip successfully, exit...');
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
    } else if (code === errCode) {
        title = 'other-failed';
    } else {
        title = 'test';
        content = 'test success';
    }
    if (msg) {
        content += msg;
        windowLogAndSleep(msg);
    }
    imgUrl = screenshotsAndUpload(title);
    let scriptCostSec = (new Date().getTime() - scriptStartTime) / 1000.0;
    notifyMsg(title, content + ', time cost:' + scriptCostSec + ' seconds', imgUrl);
    if (code !== 0) {
        postExit();
    }
    if (code < 0) {
        app.startActivity('console');
    }
    hamibot.exit();
}

function postExit() {
    if (testingExitAppPostEnabled && env.exitAppPost) {
        windowLogAndSleep('kill the app post exit.');
        killApp(dingTalkAppName);
    }
    if (testingLockScreenPostEnabled && env.lockScreenPost) {
        windowLogAndSleep('lock the screen post exit.');
        lockScreenInHome();
    }
}

function uploadImageAndGetLink(filePath) {
    windowLogAndSleep('ready to upload the file:' + filePath);
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
        windowLogAndSleep('upload img error:' + err);
    }
    if (res == null || res.body == null) {
        windowLogAndSleep('failed to upload img with empty response');
        return null;
    }

    const responseJson = res.body.json();
    if (responseJson.status) {
        const url = responseJson.data.imgurl
        windowLogAndSleep('upload success, the img url:' + url);
        return url;
    } else {
        windowLogAndSleep('upload failed msg:' + responseJson.message);
        return null;
    }
}

function getLockTime() {
    let lockTime = Settings.System.getInt(context.getContentResolver(), Settings.System.SCREEN_OFF_TIMEOUT);
    log('auto-lock time:', lockTime);
    if (null == lockTime || "" === lockTime || "undefined" === lockTime) {
        return 4000;
    }
    return lockTime / 2;
}

function textClick(s, findTimeoutMs) {
    let uiObj = text(s).findOne(findTimeoutMs ? findTimeoutMs : 1000);
    if (uiObj != null) {
        if (uiObj.click()) {
            windowLogAndSleep('component clicked text[' + s + ']');
            return true;
        } else {
            let bounds = uiObj.bounds();
            let centerX = bounds.centerX();
            let centerY = bounds.centerY();
            let clicked = click(centerX, centerY);
            windowLogAndSleep('[' + centerX + ',' + centerY + ']clicked text[' + s + ']:' + clicked);
            return clicked;
        }
    }
    return false;
}

function idClick(objId, timeout) {
    let uiObj = id(objId).findOne(timeout ? timeout : 100);
    if (uiObj != null) {
        windowLogAndSleep('found component by id:' + objId);
        if (uiObj.click()) {
            windowLogAndSleep('success to click component by id:' + objId);
            return true;
        } else {
            let bounds = uiObj.bounds();
            let centerX = bounds.centerX();
            let centerY = bounds.centerY();
            windowLogAndSleep('ready to click component[' + objId + '] by position [' + centerX + ', ' + centerY + ']');
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

function tryCallUntil(times, exitPredicate, func, sleepMs) {
    const st = sleepMs ? sleepMs : 1000;
    for (let i = 0; i < times; i++) {
        if (exitPredicate != null && exitPredicate(times - i)) {
            return true;
        } else {
            if (func != null) {
                func(times - i);
            }
            sleep(st);
        }
    }
    return false;
}

function killApp(appName) {
    let isKillAppSuccess = false;
    let packageName = app.getPackageName(appName);
    if (tryCallUntil(5, () => app.openAppSetting(packageName))) {
        windowLogAndSleep('enter kill app page');
        if (tryCallUntil(10, () => textExists("结束运行") || textExists("强行停止"))) {
            if (textExists("结束运行")) {
                windowLogAndSleep('exists text[结束运行]');
                textClick("结束运行");
                windowLogAndSleep('clicked text[结束运行]');
                if (tryCallUntil(5, () => textExists("确定"))) {
                    textClick("确定");
                    windowLogAndSleep('clicked text [结束运行-确定]');
                }
                isKillAppSuccess = tryCallUntil(5, () => textExists("结束运行"));
            } else if (textExists("强行停止")) {
                windowLogAndSleep('exists text[强行停止]');
                textClick("强行停止");
                windowLogAndSleep('clicked text [强行停止]');
                sleep1Second();
                if (tryCallUntil(5, () => textExists("确定"))) {
                    textClick("确定");
                    windowLogAndSleep('clicked text [强行停止-确定]');
                }
                isKillAppSuccess = tryCallUntil(5, () => textExists("强行停止"));
            } else {
                isKillAppSuccess = false;
            }
        } else {
            exitScript(errCode, 'not support to kill the app, [结束运行] or [强行停止] not found');
            return false;
        }
    } else {
        exitScript(errCode, 'not support to kill the app, cannot goto kill app page');
        return false;
    }
    if (isKillAppSuccess) {
        windowLogAndSleep('success to kill the app');
    } else {
        exitScript(errCode, 'failed to kill the app');
    }
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

function windowLogAndSleep(s, sleepMs) {
    setFloatText(s);
    log(s);
    sleep(sleepMs ? sleepMs : 1000);
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
        windowLogAndSleep('notify disabled or token is empty.');
        return;
    }
    windowLogAndSleep('notify title:' + title + ', content:' + content);
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