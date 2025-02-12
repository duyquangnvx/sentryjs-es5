String.prototype.replaceAll = function (key, value) {
    let ans = (" " + this).slice(1);
    return ans.replace(new RegExp(key, "g"), value);
};