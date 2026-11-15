"""
Simulation of the Bell-type timing algorithm with t0 ~ U[T, 5T].

Only the right-hand histogram is kept:
  - x-axis : r = 2*r0 + r1
  - y-axis : rate = count / N
  - bars for r < 0 are filled with fine hatching (no solid fill)
  - bars for r > 0 are solid-filled

The figure is saved as vector graphics (.pdf and .ps), so it scales
losslessly to any size.  All elements (lines, bars, hatch strokes,
text) are vector primitives -- no rasterisation happens.

Fonts are embedded as TrueType (fonttype=42) so the PDF/PS
looks identical on any machine.
"""

import os, numpy as np
import matplotlib as mpl
import matplotlib.pyplot as plt

# ------------------------------------------------------------------
# 0. Global matplotlib settings for vector output
# ------------------------------------------------------------------
mpl.rcParams['pdf.fonttype'] = 42        # embed TrueType in PDF
mpl.rcParams['ps.fonttype']  = 42        # embed TrueType in PS
mpl.rcParams['font.family']  = 'DejaVu Sans'

seed = int.from_bytes(os.urandom(4), "big")
np.random.seed(seed)

# ------------------------------------------------------------------
# 1. Parameters
# ------------------------------------------------------------------
T    = 1000
m0, M1 =  1,  1
m1, M0 = -1, -1
N    = 20000                              # number of iterations

# ------------------------------------------------------------------
# 2. Storage
# ------------------------------------------------------------------
r0 = np.empty(N)
r1 = np.empty(N)

# ------------------------------------------------------------------
# 3. Main loop
# ------------------------------------------------------------------
for cnt in range(N):
    # 0. t0 uniform on [T, 5T]
    t0 = np.random.uniform(T, 5*T)

    # 1. t1 ~ U[t0, t0 + T]
    t1 = np.random.uniform(t0, t0 + T)

    # 2/3. t2 = t1 + X, t3 = t1 + Y,  X,Y ~ U[0, T/2]
    X  = np.random.uniform(0, T/2)
    Y  = np.random.uniform(0, T/2)
    t2 = t1 + X
    t3 = t1 + Y

    # t1 > T almost surely, so only the "random" branch fires.
    # ---- outcome r0 at P0 ----
    if t1 < T and t3 >= T:
        r0[cnt] = m0
    elif (t1 < T and t3 < T) or (t1 > T and t3 > T):
        r0[cnt] = np.random.choice([m0, M0])
    else:
        r0[cnt] =  M0

    # ---- outcome r1 at P1 ----
    # (physically consistent version using t2)
    if t1 < T and t2 >= T:
        r1[cnt] = M1
    elif (t1 < T and t2 < T) or (t1 > T and t2 > T):
        r1[cnt] = np.random.choice([m1, M1])
    else:
        r1[cnt] =  M1

# ------------------------------------------------------------------
# 4. Combined result
# ------------------------------------------------------------------
r = (2*r0 + r1+5)/2 # mapping to sub-case of case 2c

vals, counts = np.unique(r, return_counts=True)
rate = 1.0*counts/N;
print(f"mean(rate) = {rate.mean():.6f}  ")
print(f"std(rate)  = {rate.std():.6f}  ")
#print("empirical distribution of r:")
for v, c in zip(vals, counts):
    print(f"    r = {int(v):+d}  :  {c:4d}  (rate = {c/N:.3f})")

# ------------------------------------------------------------------
# 5. Build the (single) histogram figure
# ------------------------------------------------------------------
fig, ax = plt.subplots(figsize=(5, 4))

edges   = np.array([0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5])
counts, edges = np.histogram(r, bins=edges)
centers = 0.5 * (edges[:-1] + edges[1:])
widths  = np.diff(edges)

for c, x, w in zip(counts, centers, widths):
    rate = c / N *100.0                             # y = count / N in percentage
    if x < 1.9:                                    
        ax.bar(x-0.25, rate, width=w, facecolor='none', edgecolor='black', hatch='//////',  linewidth=0.8)
    elif x < 3.7:   
        ax.bar(x-0.25, rate, width=w, facecolor='C0', edgecolor='black', linewidth=0.8)
    else:
        ax.bar(x-0.25, rate, width=w, facecolor='none', edgecolor='black', hatch='\\\\\\',   linewidth=0.8)

ax.axhline(0.0, color='black', linewidth=0.5)
ax.set_xticks([1, 2, 3, 4])
ax.set_xlim(edges[0], edges[-1])
ax.set_xlabel('case 2c1 ~ 2c4')
ax.set_ylabel('rate = count / N (%)')
#ax.set_title('Rate distribution of r  (negative bars hatched)')
ax.grid(True, axis='y', linestyle=':', linewidth=0.6, alpha=0.6)

fig.tight_layout()

# ------------------------------------------------------------------
# 6. Save as vector graphics (lossless scaling)
#    -> format is taken from the file extension
# ------------------------------------------------------------------
fig.savefig('rhist.pdf', bbox_inches='tight', pad_inches=0.05)
fig.savefig('rhist.ps',  bbox_inches='tight', pad_inches=0.05)
# Optional extra formats:
# fig.savefig('r_hist.svg', bbox_inches='tight', pad_inches=0.05)
# fig.savefig('r_hist.eps', bbox_inches='tight', pad_inches=0.05)

print("\nSaved vector figures:")
print("  ./r_hist.pdf")
print("  ./r_hist.ps")

# ------------------------------------------------------------------
# 7. (Optional) show on screen -- comment out if running headless
# ------------------------------------------------------------------
plt.show()