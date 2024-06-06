use orion::numbers::{FixedTrait, FP16x16};

fn compute(ref a: Array<FP16x16>) {
a.append(FP16x16 { mag: 88221, sign: true });
a.append(FP16x16 { mag: 52098, sign: true });
a.append(FP16x16 { mag: 23466, sign: true });
a.append(FP16x16 { mag: 6716, sign: true });
a.append(FP16x16 { mag: 9365, sign: true });
a.append(FP16x16 { mag: 31009, sign: true });
a.append(FP16x16 { mag: 18894, sign: true });
a.append(FP16x16 { mag: 4415, sign: true });
a.append(FP16x16 { mag: 12527, sign: false });
a.append(FP16x16 { mag: 34278, sign: true });
a.append(FP16x16 { mag: 12022, sign: false });
a.append(FP16x16 { mag: 850, sign: true });
}