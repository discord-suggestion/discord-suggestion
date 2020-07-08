const FLAGS = {
  CONTINUE: 1 << 0,
  HANDLED:  1 << 1,
  STOP:     1 << 2
};
exports.FLAGS = FLAGS;

const isFlag = function(value, flag) {
  return (value & flag) === flag;
}
exports.isFlag = isFlag;
